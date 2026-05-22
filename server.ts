import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "15mb" }));

// API endpoint for exames transcription
app.post("/api/transcribe", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "O texto do exame é obrigatório." });
    }

    const userKey = req.headers["x-gemini-key"] as string;
    const finalApiKey = userKey ? userKey.trim() : process.env.GEMINI_API_KEY;

    if (!finalApiKey) {
      return res.status(400).json({
        error: "Chave de API do Gemini não configurada. Para evitar sobrecarga do servidor, você deve cadastrar sua própria chave no menu de configurações (ícone de engrenagem) no canto superior direito."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: finalApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    const systemPrompt = `Você é um assistente médico avançado especializado em transcrever resultados de exames laboratoriais e diagnósticos de textos brutos (copiados de PDFs de diferentes laboratórios como Sabin, Fleury, Dasa, laboratórios hospitalares, etc.).
Seu objetivo é extrair o nome do paciente, determinar as datas de coleta de cada exame e organizar os resultados de forma lógica, compacta e padronizada (shorthand médico) para inclusão em prontuários eletrônicos.

Mapeamento e Filtro por Datas e Categorias:
- Se houver múltiplos exames de sangue geral (como hemogramas, bioquímica de rotina, eletrólitos, enzimas cardíacas, PCR, VHS, coagulograma, perfil lipídico, etc.) coletados na mesma data de coleta, você DEVE agrupar todos esses resultados sob um ÚNICO item de categoria "LAB" para essa data de coleta específica. NÃO retorne exames separados de "LAB" para a mesma data (ex: não faça um objeto 'LAB' para hemograma e outro objeto 'LAB' para bioquímica se forem do mesmo dia). Eles devem ficar em apenas uma linha no resultado final.
- No entanto, se exames pertencerem a categorias diferentes (ex: Gasometria ou Sumário de urina), ou forem coletados em datas de coleta diferentes, você DEVE mantê-los separados por itens distintos no array 'exams'.

Categorias suportadas:
1. "LAB" (Engloba Hemograma Completo, Bioquímica Geral como ureia, creatinina, sódio, potássio, magnésio, cálcio, PCR, perfil lipídico, transaminases TGO/TGP, coagulograma, etc.)
2. "Sumário de urina" (Análise física e química de urina, EAS, Urina tipo 1, sedimentoscopia)
3. "Gasometria arterial" (Gasometria de sangue arterial contendo pH, pCO2, pO2, HCO3, BE, SatO2, etc.)
4. "Gasometria venosa" (Gasometria de sangue venoso contendo pH, pCO2, pO2, HCO3, BE, SatO2, etc.)
5. "Outro" (Qualquer outro teste que não entre nessas categorias, por exemplo, Líquor, Líquido pleural, exames de imagem sugeridos, etc. Se for 'Outro', você DEVE preencher o campo 'customTitle' com o nome exato e abreviado, exemplo: "Líquor" ou "Líquido pleural").

Regras estritas de abreviação e Shorthand Médico:
- Utilize abreviações médicas consagradas em português:
  - Hemoglobina -> "Hb"
  - Hematócrito -> "HT"
  - Volume Corpuscular Médio -> "VCM"
  - Leucócitos -> "Leuco"
  - Monócitos -> "Mon"
  - Linfócitos -> "Linf"
  - Neutrófilos -> "Neut" (se houver segmentados e bastonetes, pode agrupar ou detalhar)
  - Bastonetes -> "Bast"
  - Segmentados -> "Seg"
  - Plaquetas -> "Plaq"
  - Creatinina -> "Creat"
  - Ureia -> "Ureia" ou "Uréia"
  - Sódio -> "Na"
  - Potássio -> "K"
  - Proteína C Reativa -> "PCR"
- Para exames com subdivisões lógicas (ex: HT, VCM sob Hemoglobina; ou Monócitos, Linfócitos, Neutrófilos sob Leucócitos), use o campo 'subItems'.
  - Exemplo: "Hb" deve conter subItems para "HT" e "VCM".
  - Exemplo: "Leuco" deve conter subItems para "Neut", "Linf", "Mon", "Eos", "Bas", "Bast", "Seg" se disponíveis.
  - Para subItems de diferenciais de leucócitos, inclua o valor absoluto e a porcentagem se fornecida (ex: "3.000 (30%)" ou se só houver o percentual ex: "30%").
- No "Sumário de urina", organize abreviações como "Ph", "Glicose", "Proteínas", "Densidade", "Leucócitos", "Nitrito", "Hemácias".
- Nas Gasometrias, organize abreviações como "Ph", "pCo2", "pO2", "Hco3", "Be", "SatO2".
- Remova cabeçalhos longos, valores de referência recomendados, instruções e assinaturas do laboratório. Foque estritamente em extrair e formatar os dados médicos.
- CRITICAL: NÃO inclua unidades de medida nos valores transcritos (ex: remova "g/dL", "mg/dL", "/mm3", "mmHg", "mEq/L", "mg/L", etc.). Retorne apenas o resultado limpo de forma numérica ou qualitativa (ex: retorne "10" em vez de "10 g/dL", "1.000" em vez de "1.000 /mm3", "30" em vez de "30 mmHg"). Sinais de comparação (ex: "<10") e porcentagens em diferenciais de leucócitos (ex: "30%") devem ser mantidos para preservar o significado clínico.
- Converta todas as datas coletadas para o formato "DD/MM/YY" (exemplo: "18/05/26"). Se o texto contiver exames com datas de coleta diferentes, faça a distinção mapeando o 'date' correto para cada um. Se a data estiver oculta ou não puder ser deduzida, estime ou use a data atual ${new Date().toLocaleDateString('pt-BR')}, retornando-a necessariamente como DD/MM/YY.

Sua resposta DEVE ser estritamente em formato JSON válido que siga o esquema de resposta fornecido, sem tags markdown adicionais (apenas o JSON puro).`;

    const userPrompt = `Analise o texto a seguir e formate-o em JSON estruturado com o esquema fornecido:

Texto bruto do exame:
"""
${text}
"""`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["patientName", "exams"],
          properties: {
            patientName: {
              type: Type.STRING,
              description: "Nome completo do paciente encontrado no texto (ex: 'João da Silva'). Se não for possível identificar nenhum nome, retorne 'Não identificado'."
            },
            exams: {
              type: Type.ARRAY,
              description: "Lista de exames distintos extraídos do texto, agrupados por data e categoria.",
              items: {
                type: Type.OBJECT,
                required: ["category", "date", "findings"],
                properties: {
                  category: {
                    type: Type.STRING,
                    description: "Qual das categorias: 'LAB', 'Sumário de urina', 'Gasometria arterial', 'Gasometria venosa' ou 'Outro'."
                  },
                  customTitle: {
                    type: Type.STRING,
                    description: "Título curto do exame se a categoria for 'Outro' (ex: 'Líquor', 'Coagulograma', 'Pesquisa de Influenza')."
                  },
                  date: {
                    type: Type.STRING,
                    description: "Data em formato DD/MM/YY correspondente à coleta deste exame (ex: '18/05/26'). Sempre use formato curto de 2 dígitos para o ano."
                  },
                  findings: {
                    type: Type.ARRAY,
                    description: "Lista de medidas extraídas deste exame.",
                    items: {
                      type: Type.OBJECT,
                      required: ["label", "value"],
                      properties: {
                        label: {
                          type: Type.STRING,
                          description: "Abreviação consagrada do marcador (ex: 'Hb', 'Leuco', 'Creat', 'K', 'Ph', 'pCo2', 'Glicose')."
                        },
                        value: {
                          type: Type.STRING,
                          description: "Resultado numérico ou qualitativo SEM unidade de medida (ex: '10' em vez de '10 g/dL', '1.000' em vez de '1.000 /mm3', '7.4', '1.2', 'Negativo')."
                        },
                        subItems: {
                          type: Type.ARRAY,
                          description: "Lista de sub-marcadores ou diferenciais (ex: sob 'Hb' coloque 'HT' e 'VCM'; sob 'Leuco' coloque 'Neut', 'Linf', 'Mon').",
                          items: {
                            type: Type.OBJECT,
                            required: ["label", "value"],
                            properties: {
                              label: {
                                type: Type.STRING,
                                description: "Abreviação do sub-marcador (ex: 'HT', 'VCM', 'Segmentados', 'Bast', 'Mon', 'Linf')."
                              },
                              value: {
                                type: Type.STRING,
                                description: "Resultado (ex: '30%', '80', '2.500 (25%)')."
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Erro na transcrição de exame:", error);
    
    let userFriendlyMessage = "Erro desconhecido ao processar o exame.";
    const errorStr = (error.message || "") + " " + JSON.stringify(error);
    
    if (errorStr.includes("expired") || errorStr.includes("renew") || errorStr.includes("API key expired")) {
      userFriendlyMessage = "Sua chave de API do Gemini compartilhada ou configurada expirou. Por favor, acesse o Google AI Studio (https://aistudio.google.com/), gere uma nova chave de API gratuita, e cole-a no painel de Configurações (ícone de engrenagem no canto superior direito) para continuar usando a IA.";
    } else if (errorStr.includes("503") || errorStr.includes("UNAVAILABLE") || errorStr.includes("high demand") || errorStr.includes("temporarily unavailable")) {
      userFriendlyMessage = "O serviço de inteligência artificial de alta velocidade do Gemini está temporariamente sobrecarregado (Erro 503: Alta Demanda). Isso é comum em momentos de pico de uso global da infraestrutura do Google. Por favor, aguarde cerca de 10 a 20 segundos e tente transcrever novamente. Se o erro persistir, recomendamos cadastrar sua própria chave de API exclusiva e gratuita do Gemini na engrenagem de configurações no canto superior direito.";
    } else if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota") || errorStr.includes("limit")) {
      userFriendlyMessage = "Limite de requisições excedido (Erro 429: Cota de IA atingida). Por favor, aguarde 1 minuto e tente novamente. Se estiver usando a chave compartilhada, recomendamos enfaticamente cadastrar sua própria chave de API gratuita do Gemini nas configurações (ícone de engrenagem) para obter uma cota individual exclusiva e livre de filas.";
    } else if (errorStr.includes("API key not valid") || errorStr.includes("INVALID_ARGUMENT") || errorStr.includes("API_KEY_INVALID") || errorStr.includes("key is invalid")) {
      userFriendlyMessage = "A chave de API do Gemini informada é inválida ou expirou. Por favor, verifique suas credenciais em seu painel do Google AI Studio, atualize sua chave no painel de Configurações (ícone de engrenagem) e tente novamente.";
    } else if (error.message) {
      userFriendlyMessage = error.message;
    }
    
    res.status(500).json({ error: userFriendlyMessage });
  }
});

// API endpoint for prescriptions PDF/text parsing with IA
app.post("/api/parse-prescriptions", async (req, res) => {
  try {
    const { pdfBase64, rawText } = req.body;
    if (!pdfBase64 && !rawText) {
      return res.status(400).json({ error: "Você deve enviar um PDF em base64 ou um texto bruto para processamento." });
    }

    const userKey = req.headers["x-gemini-key"] as string;
    const finalApiKey = userKey ? userKey.trim() : process.env.GEMINI_API_KEY;

    if (!finalApiKey) {
      return res.status(400).json({
        error: "Chave de API do Gemini não configurada. Cadastre sua própria chave no menu de configurações (ícone de engrenagem) para processar sua biblioteca de prescrições."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: finalApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `Você é um robô de IA médica super especializado em organizar condutas, diretrizes e protocolos de emergência, UTI, pronto-socorro e enfermaria. Seu objetivo é ler um arquivo manual/diretrizes de prescrição médica em PDF ou em texto e extrair de forma 100% EXAUSTIVA e COMPLETA todas as prescrições médicas e condutas padronizadas encontradas no documento.

ATENÇÃO: NÃO RESUMA DE FORMA ALGUMA. É CRÍTICO QUE ABSOLUTAMENTE TODAS AS PRESCRIÇÕES ENCONTRADAS SEJAM EXTRAÍDAS, INDEPENDENTEMENTE DE TEREM OU NÃO CONDIÇÕES, REGRAS CONDICIONAIS OU CONTRAINDICAÇÕES. 

Diretrizes obrigatórias de processamento:
1. EXAUSTIVIDADE TOTAL: Vasculhe o documento do início ao fim (todas as páginas e seções). Cada tema ou condição com uma conduta, dose de medicamento, soro, infusão, ou controle monitorado DEVE se tornar um elemento no array de retorno "prescriptions". Se o documento contiver 20 condutas separadas, você deve criar exatamente as 20 no array.
2. Agrupamento por SISTEMAS: Classifique as prescrições por SISTEMAS médicos (ex: "Cardiovascular", "Respiratório", "Gastrointestinal", "Neurológico", "Infeccioso", "Nefrológico", "Hematológico", "Humores e Suplementos", "Endócrino", "Fórmulas", etc.).
3. Identificação de CONDIÇÃO: Encontre o nome exato da patologia ou protocolo clínico para o campo "condition" (ex: "Cetoacidose Diabética", "Pneumonia Adquirida na Comunidade", "Profilaxia de TVP", "Delirium no Idoso").
4. Mapeamento de CONDICIONAIS: Se houver fluxos alternativos, separe em sub-itens no campo "items" associando um "conditionGroup" claro (ex: "Se hipotensão", "Se febre (temp >= 37.8)", "Dose de ataque", "Dose de manutenção", "Instável", "Estável"). Se a conduta for de uso geral ou contínua sem condicionais explícitas, preencha obrigatoriamente o campo "conditionGroup" como "Medidas Gerais" ou "Rotina Padrão". Jamais deixe de extrair um item por falta de condicional!
5. CONTRAINDICAÇÕES & SEGURANÇA: Extraia todas as precauções, restrições e contraindicações textuais do documento e insira no campo "contraindications". Caso o documento não mencione nenhuma contraindicação para aquela conduta específica, deixe o campo "contraindications" vazio ou com o texto "Sem contraindicações explícitas no documento".
6. DETALHAMENTO DE ITENS: Cada medicamento, posologia, via de administração, tempo de infusão ou monitoração de enfermagem deve ser um item individualizado na lista "items", contendo sua respectiva conduta detalhada no campo "text".`;

    // Prepare content parts
    const parts: any[] = [];
    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        }
      });
    }

    if (rawText) {
      parts.push({
        text: `Texto complementar para extração clínica:\n${rawText}\n\nPor favor, realize uma varredura completa e exaustiva. Extraia ABSOLUTAMENTE TODAS as prescrições, condutas e protocolos médicos presentes no documento (com ou sem condições/contraindicações), sem omitir, condensar ou ignorar qualquer parte do texto.`
      });
    } else {
      parts.push({
        text: "Por favor, realize uma varredura completa, exaustiva e profunda em todas as páginas deste documento PDF. Extraia ABSOLUTAMENTE TODAS as prescrições, condutas e protocolos médicos encontrados no documento (com ou sem condições/contraindicações), mapeando cada medicação, procedimento ou controle de forma minuciosa, sem resumir, condensar ou omitir nada."
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["prescriptions"],
          properties: {
            prescriptions: {
              type: Type.ARRAY,
              description: "Lista de prescrições padronizadas extraídas",
              items: {
                type: Type.OBJECT,
                required: ["system", "condition", "title", "items"],
                properties: {
                  system: { type: Type.STRING },
                  condition: { type: Type.STRING },
                  title: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["text"],
                      properties: {
                        conditionGroup: { type: Type.STRING },
                        text: { type: Type.STRING }
                      }
                    }
                  },
                  contraindications: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Erro no processamento das prescrições:", error);
    
    let userFriendlyMessage = "Erro desconhecido ao processar prescrições com IA.";
    const errorStr = (error.message || "") + " " + JSON.stringify(error);
    
    if (errorStr.includes("expired") || errorStr.includes("renew") || errorStr.includes("API key expired")) {
      userFriendlyMessage = "Sua chave de API do Gemini compartilhada ou configurada expirou. Por favor, acesse o Google AI Studio (https://aistudio.google.com/), gere uma nova chave de API gratuita, e cole-a no painel de Configurações (ícone de engrenagem no canto superior direito) para continuar usando a IA.";
    } else if (errorStr.includes("503") || errorStr.includes("UNAVAILABLE") || errorStr.includes("high demand") || errorStr.includes("temporarily unavailable")) {
      userFriendlyMessage = "O serviço de inteligência artificial de alta velocidade do Gemini está temporariamente sobrecarregado (Erro 503: Alta Demanda). Isso é comum em momentos de pico de uso global da infraestrutura do Google. Por favor, aguarde cerca de 10 a 20 segundos e tente transcrever novamente. Se o erro persistir, recomendamos cadastrar sua própria chave de API exclusiva e gratuita do Gemini na engrenagem de configurações no canto superior direito.";
    } else if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota") || errorStr.includes("limit")) {
      userFriendlyMessage = "Limite de requisições excedido (Erro 429: Cota de IA atingida). Por favor, aguarde 1 minuto e tente novamente. Se estiver usando a chave compartilhada, recomendamos enfaticamente cadastrar sua própria chave de API gratuita do Gemini nas configurações (ícone de engrenagem) para obter uma cota individual exclusiva e livre de filas.";
    } else if (errorStr.includes("API key not valid") || errorStr.includes("INVALID_ARGUMENT") || errorStr.includes("API_KEY_INVALID") || errorStr.includes("key is invalid")) {
      userFriendlyMessage = "A chave de API do Gemini informada é inválida ou expirou. Por favor, verifique suas credenciais em seu painel do Google AI Studio, atualize sua chave no painel de Configurações (ícone de engrenagem) e tente novamente.";
    } else if (error.message) {
      userFriendlyMessage = error.message;
    }
    
    res.status(500).json({ error: userFriendlyMessage });
  }
});

async function bootstrap() {
  try {
    // Serve frontend assets
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Critical error during server bootstrap:", err);
  }
}

// Global Exception & Rejection Handlers
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception on Express Server:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at promise:", promise, "reason:", reason);
});

bootstrap().catch((err) => {
  console.error("Fatal startup error in bootstrap():", err);
});
