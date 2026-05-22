import React, { useState, useEffect, useMemo, useRef } from "react";
import { Trash2, Clipboard, Upload, Search, Check, AlertTriangle, FileText, Info, Sparkles, RefreshCw, X, HelpCircle, Loader2, ChevronDown, ChevronRight, Plus, Pencil, Save } from "lucide-react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { User } from "firebase/auth";
import { Prescription, AppSettings } from "../types";

// Limpa e padroniza os nomes dos sistemas (remove a palavra "sistema" do início)
const formatSystemName = (sys: string): string => {
  let s = (sys || "Geral").trim();
  s = s.replace(/^sistema\s+/i, "");
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
};

// Divide strings longas em blocos preservando quebras de linha
const splitTextIntoChunks = (text: string, maxChars = 8000): string[] => {
  if (text.length <= maxChars) {
    return [text];
  }
  const lines = text.split("\n");
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const line of lines) {
    if ((currentChunk + "\n" + line).length > maxChars && currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk = currentChunk ? currentChunk + "\n" + line : line;
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
};

interface PrescriptionsViewProps {
  currentUser: User | null;
  settings: AppSettings;
}

// Exemplos de demonstração caso o usuário não tenha um PDF em mãos
const MOCK_DEMO_PRESCRIPTIONS: Omit<Prescription, "id" | "timestamp">[] = [
  {
    system: "Cardiovascular",
    condition: "Insuficiência Cardíaca Aguda Descompensada (Perfil B - Congesto)",
    title: "Manejo Clínico e Prescrição de IC Aguda (Congestão Pulmonar/Sistêmica Estável)",
    contraindications: "Evitar betabloqueadores nas primeiras horas de descompensação aguda. Monitorar função renal (Creat > 2.5 ou K > 5.5 exigem cautela extrema com diuréticos e vasodilatadores). Evitar hidratação venosa de manutenção.",
    items: [
      {
        conditionGroup: "Paciente Estável",
        text: "Furosemida 20mg a 40mg (1 a 2 ampolas) EV em bolus. Reavaliar débito urinário em 2 horas."
      },
      {
        conditionGroup: "Paciente Estável",
        text: "Isosorbida (Dinitrato) 5mg via sublingual se Pressão Arterial Sistólica (PAS) > 120 mmHg e congestão persistente."
      },
      {
        conditionGroup: "Paciente Estável",
        text: "Oxigênio sob cateter nasal de O2 a 2-3 L/min se saturação de oxigênio (SpO2) < 92%."
      },
      {
        conditionGroup: "Se Paciente Instável (Grau de Congestão Refratário)",
        text: "Iniciar infusão contínua de Nitroglicerina (Tridil) 50mg em 250ml de SG 5% a 5 ml/h (ajustar de acordo com a PA, mantendo PAS > 90 mmHg)."
      },
      {
        conditionGroup: "Se Paciente Instável (Sinais de Baixo Débito / Choque Cardiogênico)",
        text: "Descontinuar vasodilatadores imediatamente. Avaliar início de Dobutamina 250mg em 250ml de SG 5% a 2 a 10 mcg/kg/min sob monitorização em UTI."
      }
    ]
  },
  {
    system: "Respiratório",
    condition: "Crise de Asma Brônquica Grave",
    title: "Protocolo de Emergência para Asma Aguda Grave em Adulto",
    contraindications: "Não utilizar bloqueadores neuromusculares ou sedativos fora do ambiente de intubação. Evitar hidratação excessiva para não piorar a mecânica ventilatória.",
    items: [
      {
        conditionGroup: "Medidas Gerais (Todos)",
        text: "Oxigenoterapia para manter SpO2 entre 93% e 95%."
      },
      {
        conditionGroup: "Paciente Estável",
        text: "Nebulização com Fenoterol (Berotec) 10 a 20 gotas + Brometo de Ipratrópio (Atrovent) 20 a 40 gotas + SF 0.9% 3ml a cada 20 minutos por 3 ciclos consecutivos."
      },
      {
        conditionGroup: "Paciente Estável",
        text: "Prednisona 40mg a 60mg via oral (dose única imediata) ou Hidrocortisona 100mg a 200mg EV."
      },
      {
        conditionGroup: "Se Refratário / Resposta Insuficiente após 1 hora",
        text: "Sulfato de Magnésio 2g EV diluído em 100ml de SF 0.9% para correr em 20 minutos."
      },
      {
        conditionGroup: "Se Paciente Instável (Parada Respiratória Iminente)",
        text: "Preparar intubação orotraqueal em sequência rápida. Usar Cetamina como indutor devido ao efeito broncodilatador."
      }
    ]
  },
  {
    system: "Infeccioso",
    condition: "Sepse e Choque Séptico",
    title: "Prescrição Padronizada de Primeiro Atendimento (Protocolo de 1 Hora)",
    contraindications: "Não postergar início de antibióticos para aguardar resultados laboratoriais adicionais ou culturas demoradas.",
    items: [
      {
        conditionGroup: "Medidas Gerais (Início Imediato)",
        text: "Coleta de 2 pares de hemoculturas de sítios diferentes antes de iniciar o antibiótico (não atrasar infusão por mais de 45 min)."
      },
      {
        conditionGroup: "Medidas Gerais (Início Imediato)",
        text: "Antibioticoterapia de amplo espectro empírica sugerida: Piperacilina/Tazobactam 4.5g EV imediato + Vancomicina 1g a 1.5g EV."
      },
      {
        conditionGroup: "Se Paciente Instável (Hipotensão PAS < 90 ou Lactato >= 4.0 mmol/L)",
        text: "Ressuscitação volêmica vigorosa com SF 0.9% ou Ringer Lactato a 30 mL/kg nas primeiras 3 horas."
      },
      {
        conditionGroup: "Se Refratário à Expansão Volêmica Inicial",
        text: "Iniciar Noradrenalina diluída (4 ampolas em 210ml de SG 5%) por acesso venoso central a 5 ml/h, titulando para manter Pressão Arterial Média (PAM) >= 65 mmHg."
      }
    ]
  }
];

export default function PrescriptionsView({ currentUser, settings }: PrescriptionsViewProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // States para colapsar agrupamentos de sistemas clínicos
  const [collapsedSystems, setCollapsedSystems] = useState<Record<string, boolean>>({});
  const [allCollapsed, setAllCollapsed] = useState(false);

  // States para exclusão segura compatível com iframe (sem window.confirm)
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<string | null>(null);

  // States para criação/edição manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [formState, setFormState] = useState<Omit<Prescription, "id" | "timestamp">>({
    system: "",
    condition: "",
    title: "",
    items: [{ conditionGroup: "Medidas Gerais", text: "" }],
    contraindications: ""
  });

  // States para upload e processamento do PDF por IA
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPastingText, setIsPastingText] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;
    setUploadError(null);
    setIsProcessing(true);
    await startExtraction(undefined, pastedText.trim());
    setPastedText("");
    setIsPastingText(false);
  };

  const isDark = settings.theme === "dark-emerald" || settings.theme === "midnight";

  // Tema de layout selecionado
  const themeClasses = {
    hospital: {
      accent: "text-teal-600 bg-teal-50 border-teal-200",
      primaryBtn: "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/10",
      accentBorder: "border-teal-500/30",
      accentBg: "bg-teal-50/50",
      tagColor: "bg-teal-100 text-teal-800 border-teal-200",
      progress: "bg-teal-600",
      card: "bg-white border-slate-200/80 shadow-sm",
      input: "bg-slate-50 border-slate-200 text-slate-700",
      text: "text-slate-800",
      subText: "text-slate-500",
    },
    emerald: {
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
      primaryBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10",
      accentBorder: "border-emerald-500/30",
      accentBg: "bg-emerald-50/50",
      tagColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      progress: "bg-emerald-600",
      card: "bg-white border-slate-200/80 shadow-sm",
      input: "bg-slate-50 border-slate-200 text-slate-700",
      text: "text-slate-800",
      subText: "text-slate-500",
    },
    light: {
      accent: "text-blue-600 bg-blue-50 border-blue-200",
      primaryBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10",
      accentBorder: "border-blue-500/30",
      accentBg: "bg-blue-50/50",
      tagColor: "bg-blue-100 text-blue-800 border-blue-200",
      progress: "bg-blue-600",
      card: "bg-white border-slate-200/80 shadow-sm",
      input: "bg-slate-50 border-slate-200 text-slate-700",
      text: "text-slate-800",
      subText: "text-slate-500",
    },
    charcoal: {
      accent: "text-slate-700 bg-slate-100 border-slate-300",
      primaryBtn: "bg-slate-800 hover:bg-slate-950 text-white shadow-slate-900/10",
      accentBorder: "border-slate-800/30",
      accentBg: "bg-slate-100/50",
      tagColor: "bg-slate-200 text-slate-800 border-slate-300",
      progress: "bg-slate-800",
      card: "bg-white border-slate-200/80 shadow-sm",
      input: "bg-slate-100 border-slate-300 text-slate-700",
      text: "text-slate-800",
      subText: "text-slate-500",
    },
    "dark-emerald": {
      accent: "text-emerald-400 bg-emerald-950/40 border-emerald-900/50",
      primaryBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10",
      accentBorder: "border-emerald-800/50",
      accentBg: "bg-emerald-950/20",
      tagColor: "bg-emerald-900/50 text-emerald-300 border-emerald-800/30",
      progress: "bg-emerald-600",
      card: "bg-slate-900 border-slate-800 shadow-xl shadow-black/20",
      input: "bg-slate-950 border-slate-800 text-slate-200",
      text: "text-slate-100",
      subText: "text-slate-400",
    },
    midnight: {
      accent: "text-sky-400 bg-sky-950/40 border-sky-900/50",
      primaryBtn: "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-500/10",
      accentBorder: "border-sky-800/50",
      accentBg: "bg-sky-950/20",
      tagColor: "bg-sky-900/50 text-sky-300 border-sky-800/30",
      progress: "bg-sky-600",
      card: "bg-slate-950 border-slate-900 shadow-xl shadow-black/20",
      input: "bg-black border-slate-800 text-slate-200",
      text: "text-slate-100",
      subText: "text-slate-400",
    }
  }[settings.theme] || {
    accent: "text-blue-600 bg-blue-50 border-blue-200",
    primaryBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10",
    accentBorder: "border-blue-500/30",
    accentBg: "bg-blue-50/50",
    tagColor: "bg-blue-100 text-blue-800 border-blue-200",
    progress: "bg-blue-600",
    card: "bg-white border-slate-200 shadow-sm",
    input: "bg-slate-50 border-slate-200 text-slate-700",
    text: "text-slate-800",
    subText: "text-slate-500",
  };

  // Sugestões para autocompletar (Sistemas e Condições existentes)
  const autocompleteData = useMemo(() => {
    const systems = new Set<string>();
    const conditions = new Set<string>();
    const groups = new Set<string>(["Medidas Gerais", "Instável", "Estável", "Refratário", "Manutenção", "Urgência"]);

    prescriptions.forEach(p => {
      if (p.system) systems.add(formatSystemName(p.system));
      if (p.condition) conditions.add(p.condition);
      p.items.forEach(it => {
        if (it.conditionGroup) groups.add(it.conditionGroup);
      });
    });

    return {
      systems: Array.from(systems).sort(),
      conditions: Array.from(conditions).sort(),
      groups: Array.from(groups).sort()
    };
  }, [prescriptions]);

  // Sync prescriptions from Firestore real-time
  useEffect(() => {
    if (!currentUser) {
      setPrescriptions([]);
      setIsLoading(false);
      return;
    }

    const prescriptionsRef = collection(db, "users", currentUser.uid, "prescriptions");
    const q = query(prescriptionsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pList: Prescription[] = [];
      snapshot.forEach((docSnap) => {
        pList.push(docSnap.data() as Prescription);
      });
      setPrescriptions(pList);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/prescriptions`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Carrega dinamicamente a biblioteca oficial PDF.js para extrair texto direto no cliente
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve(pdfjsLib);
      };
      script.onerror = () => reject(new Error("Não foi possível carregar a biblioteca de leitura de PDF (CDN indisponível)."));
      document.head.appendChild(script);
    });
  };

  // Extrai o texto do PDF usando PDF.js no navegador
  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer, onProgress: (step: string) => void): Promise<string> => {
    onProgress("Carregando motor de leitura PDF no seu navegador...");
    const pdfjsLib = await loadPdfJs();
    
    onProgress("Iniciando varredura rápida de texto do PDF...");
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    const numPages = pdf.numPages;
    
    for (let i = 1; i <= numPages; i++) {
      onProgress(`Extraindo texto localmente: página ${i} de ${numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += `--- PÁGINA ${i} ---\n${pageText}\n\n`;
    }
    
    return fullText;
  };

  // Função para ler arquivo PDF, tentar extrair texto no front-end, ou enviar Base64 se escaneado
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setUploadError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setUploadError("Por favor, envie exclusivamente um arquivo PDF contendo suas prescrições/protocolos clínicos.");
      return;
    }

    // Limitação de tamanho de segurança da IA: 40MB
    if (file.size > 40 * 1024 * 1024) {
      setUploadError("O PDF excede o tamanho limite de 40MB. Por favor envie um documento menor.");
      return;
    }

    setIsProcessing(true);
    setProgressStep("Carregando arquivo PDF...");

    const fileReader = new FileReader();
    fileReader.onload = async () => {
      try {
        const arrayBuffer = fileReader.result as ArrayBuffer;
        
        // Tenta extrair o texto diretamente no navegador
        let extractedText = "";
        try {
          extractedText = await extractTextFromPdf(arrayBuffer, setProgressStep);
        } catch (scanErr) {
          console.warn("Falha ao extrair texto local do PDF, tentando envio direto de imagem:", scanErr);
        }

        if (extractedText && extractedText.trim().length > 150) {
          // Extração com sucesso do texto digitado! Envia apenas o texto (Vantagem: sem limite de 413, sem timeout de 524)
          console.log("Texto extraído com sucesso no cliente. Tamanho:", extractedText.length);
          await startExtraction(undefined, extractedText);
        } else {
          // O PDF parece ser imagem pura / escaneada ou houve erro na extração. Enviamos o PDF como base64.
          console.log("PDF parece ser escaneado (sem texto selecionável). Enviando base64 completo...");
          setProgressStep("PDF escaneado detectado. Convertendo para imagem/base64...");
          
          const base64Reader = new FileReader();
          base64Reader.onload = async () => {
            try {
              const base64Content = (base64Reader.result as string).split(",")[1];
              if (!base64Content) {
                throw new Error("Não foi possível carregar os binários do PDF.");
              }
              await startExtraction(base64Content);
            } catch (err: any) {
              setUploadError(err.message || "Falha ao processar imagem do PDF.");
              setIsProcessing(false);
            }
          };
          base64Reader.readAsDataURL(file);
        }
      } catch (err: any) {
        setUploadError(err.message || "Falha ao analisar o PDF.");
        setIsProcessing(false);
      }
    };
    fileReader.onerror = () => {
      setUploadError("Erro na leitura do arquivo local.");
      setIsProcessing(false);
    };
    fileReader.readAsArrayBuffer(file);
  };

  // Envia dados para a API do backend (PDF ou Texto)
  const startExtraction = async (base64Pdf?: string, rawText?: string) => {
    setProgressStep("Conectando com o servidor de IA...");
    try {
      if (!settings.geminiApiKey?.trim()) {
        throw new Error("Sua Chave de API do Gemini não está cadastrada. Por favor, adicione-a nas Configurações (ícone de engrenagem) ou insira no primeiro acesso.");
      }

      let aggregatedPrescriptions: any[] = [];

      if (rawText) {
        // Divide o texto de forma limpa em blocos/blocos de até 8000 caracteres para análise integral livre de Timeout!
        const chunks = splitTextIntoChunks(rawText, 8000);
        const totalChunks = chunks.length;

        for (let i = 0; i < totalChunks; i++) {
          setProgressStep(`Análise Integral: Processando bloco ${i + 1} de ${totalChunks} com a IA (${Math.round((i / totalChunks) * 100)}% concluído)...`);
          const chunkText = chunks[i];

          const res = await fetch("/api/parse-prescriptions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Gemini-Key": settings.geminiApiKey || ""
            },
            body: JSON.stringify({ rawText: chunkText })
          });

          if (!res.ok) {
            if (res.status === 524) {
              throw new Error(`Erro de limite de tempo (Cloudflare Timeout) no bloco ${i + 1} de ${totalChunks}. Divida o texto inserido em partes ainda menores.`);
            }
            if (res.status === 413) {
              throw new Error(`Erro de arquivo muito pesado (Payload Too Large 413) no bloco ${i + 1}.`);
            }
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Erro de resposta do servidor (${res.status}) no bloco ${i + 1}.`);
          }

          const result = await res.json();
          if (result.prescriptions && Array.isArray(result.prescriptions)) {
            aggregatedPrescriptions = [...aggregatedPrescriptions, ...result.prescriptions];
          }
        }
      } else if (base64Pdf) {
        // Envia base64 integral para o PDF escaneado (sem texto copiável direto)
        setProgressStep("Análise integral: processando imagem do PDF clínico na IA... Isso pode levar de 30 a 60 segundos.");
        const res = await fetch("/api/parse-prescriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Gemini-Key": settings.geminiApiKey || ""
          },
          body: JSON.stringify({ pdfBase64: base64Pdf })
        });

        if (!res.ok) {
          if (res.status === 524) {
            throw new Error("Erro de limite de tempo (Cloudflare Timeout 524). O PDF escaneado é denso demais para processamento em bloco único. Copie o texto de dentro do documento e cole na aba 'Copiar e Colar Texto' para processar de forma 100% fracionada, integral e segura!");
          }
          if (res.status === 413) {
            throw new Error("Erro: Arquivo muito pesado (Payload Too Large - Erro 413). Selecione a aba 'Copiar e Colar Texto' acima, copie o texto do PDF e cole-o diretamente no campo de texto para evitar limites!");
          }
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Erro de resposta do servidor (${res.status}).`);
        }

        const result = await res.json();
        if (result.prescriptions && Array.isArray(result.prescriptions)) {
          aggregatedPrescriptions = result.prescriptions;
        }
      }

      if (aggregatedPrescriptions.length === 0) {
        throw new Error("Nenhuma prescrição elegível pôde ser estruturada a partir deste bloco. Verifique se o texto ou arquivo possui protocolos claros e tente novamente.");
      }

      setProgressStep(`Salvando ${aggregatedPrescriptions.length} condutas integradas de todos os blocos no Firestore seguro...`);
      await saveParsedPrescriptions(aggregatedPrescriptions);

      setProgressStep("Concluído!");
      setIsProcessing(false);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Ocorreu um erro ao processar as condutas.");
      setIsProcessing(false);
    }
  };

  // Salva no banco de dados Firestore
  const saveParsedPrescriptions = async (newPrescriptions: any[]) => {
    if (!currentUser) return;
    try {
      const batch = writeBatch(db);
      newPrescriptions.forEach((item) => {
        const docId = `presc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const pRef = doc(db, "users", currentUser.uid, "prescriptions", docId);
        
        // Garante formato correto conforme a interface
        const formattedItems = Array.isArray(item.items) 
          ? item.items.map((it: any) => ({
              conditionGroup: (it.conditionGroup || "").trim(),
              text: (it.text || "").trim()
            }))
          : [];

        const typedItem: Prescription = {
          id: docId,
          system: formatSystemName(item.system || "Geral"),
          condition: (item.condition || "Condição não especificada").trim(),
          title: (item.title || "Prescrição").trim(),
          items: formattedItems,
          contraindications: (item.contraindications || "").trim(),
          timestamp: new Date().toISOString()
        };

        batch.set(pRef, typedItem);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/prescriptions/batch`);
    }
  };

  // Alternar colapsabilidade do sistema clínico
  const toggleSystemCollapse = (system: string) => {
    setCollapsedSystems(prev => ({
      ...prev,
      [system]: !prev[system]
    }));
  };

  // Alternar todos os sistemas clínicos ao mesmo tempo
  const handleToggleAllSystems = () => {
    const isCollapsing = !allCollapsed;
    setAllCollapsed(isCollapsing);
    const updated: Record<string, boolean> = {};
    Object.keys(groupedPrescriptions).forEach((sys) => {
      updated[sys] = isCollapsing;
    });
    setCollapsedSystems(updated);
  };

  // Apaga toda a biblioteca do usuário ativo (seguro, sem dependência de popup/confirm do iframe)
  const handleWipeLibrary = async () => {
    if (!currentUser || prescriptions.length === 0) return;
    try {
      const batch = writeBatch(db);
      prescriptions.forEach((p) => {
        const docRef = doc(db, "users", currentUser.uid, "prescriptions", p.id);
        batch.delete(docRef);
      });
      await batch.commit();
      setShowWipeConfirm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/prescriptions`);
    }
  };

  // Apaga uma única prescrição mapeada (seguro, sem dependência de popup/confirm do iframe)
  const handleDeleteSingle = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "prescriptions", id));
      setPrescriptionToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/prescriptions/${id}`);
    }
  };

  // Carrega demonstração para testar sem PDF
  const handleLoadMockDemos = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    setProgressStep("Carregando protótipos de demonstração...");
    try {
      await saveParsedPrescriptions(MOCK_DEMO_PRESCRIPTIONS);
      setIsProcessing(false);
    } catch (err) {
      setIsProcessing(false);
    }
  };

  // Abre modal para criação manual
  const handleOpenCreateModal = () => {
    setEditingPrescription(null);
    setFormState({
      system: "",
      condition: "",
      title: "",
      items: [{ conditionGroup: "Medidas Gerais", text: "" }],
      contraindications: ""
    });
    setIsModalOpen(true);
  };

  // Abre modal para edição
  const handleOpenEditModal = (p: Prescription) => {
    setEditingPrescription(p);
    setFormState({
      system: p.system,
      condition: p.condition,
      title: p.title,
      items: p.items.length > 0 ? [...p.items] : [{ conditionGroup: "Medidas Gerais", text: "" }],
      contraindications: p.contraindications || ""
    });
    setIsModalOpen(true);
  };

  // Adiciona novo item ao form
  const handleAddFormItem = () => {
    setFormState(prev => ({
      ...prev,
      items: [...prev.items, { conditionGroup: "Medidas Gerais", text: "" }]
    }));
  };

  // Remove item do form
  const handleRemoveFormItem = (index: number) => {
    if (formState.items.length <= 1) return;
    setFormState(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Atualiza item do form
  const handleUpdateFormItem = (index: number, field: "conditionGroup" | "text", value: string) => {
    const newItems = [...formState.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormState(prev => ({ ...prev, items: newItems }));
  };

  // Salva ou Atualiza a prescrição no Firestore
  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!formState.system || !formState.title) {
      alert("Por favor, preencha ao menos o Sistema e o Título da conduta.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingPrescription) {
        // Update
        const docRef = doc(db, "users", currentUser.uid, "prescriptions", editingPrescription.id);
        await updateDoc(docRef, {
          ...formState,
          system: formatSystemName(formState.system),
          condition: formState.condition.trim(),
          title: formState.title.trim(),
          contraindications: formState.contraindications.trim(),
          items: formState.items.map(it => ({
            conditionGroup: it.conditionGroup?.trim() || "Medidas Gerais",
            text: it.text.trim()
          })).filter(it => it.text.length > 0)
        });
      } else {
        // Create
        const docId = `presc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const docRef = doc(db, "users", currentUser.uid, "prescriptions", docId);
        const newPrescription: Prescription = {
          id: docId,
          timestamp: new Date().toISOString(),
          system: formatSystemName(formState.system),
          condition: formState.condition.trim(),
          title: formState.title.trim(),
          contraindications: formState.contraindications.trim(),
          items: formState.items.map(it => ({
            conditionGroup: it.conditionGroup?.trim() || "Medidas Gerais",
            text: it.text.trim()
          })).filter(it => it.text.length > 0)
        };
        await setDoc(docRef, newPrescription);
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingPrescription ? OperationType.UPDATE : OperationType.CREATE, `users/${currentUser.uid}/prescriptions`);
    } finally {
      setIsSaving(false);
    }
  };

  // Copia o conteúdo estruturado da prescrição
  const handleCopyPrescription = (p: Prescription) => {
    let textToCopy = `📋 ${p.title}\n`;
    textToCopy += `📂 Sistema: ${p.system}\n\n`;

    // Agrupa itens por condicionais
    const grouped: Record<string, string[]> = {};
    p.items.forEach((item) => {
      const group = item.conditionGroup || "Medidas Gerais";
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(item.text);
    });

    Object.entries(grouped).forEach(([cond, lines]) => {
      textToCopy += `== ${cond.toUpperCase()} ==\n`;
      lines.forEach((line) => {
        textToCopy += `- ${line}\n`;
      });
      textToCopy += `\n`;
    });

    if (p.contraindications) {
      textToCopy += `⚠️ CONTRAINDICAÇÕES:\n${p.contraindications}\n`;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      alert("Erro ao copiar para a área de transferência.");
    });
  };

  // Filtra prescrições baseado na pesquisa por Sistemas ou Condições
  const filteredPrescriptions = useMemo(() => {
    const rawSearch = searchTerm.trim().toLowerCase();
    if (!rawSearch) return prescriptions;

    return prescriptions.filter((p) => {
      return (
        p.system.toLowerCase().includes(rawSearch) ||
        p.condition.toLowerCase().includes(rawSearch) ||
        p.title.toLowerCase().includes(rawSearch) ||
        p.contraindications?.toLowerCase().includes(rawSearch) ||
        p.items.some((it) => it.text.toLowerCase().includes(rawSearch) || it.conditionGroup?.toLowerCase().includes(rawSearch))
      );
    });
  }, [prescriptions, searchTerm]);

  // Agrupa as prescrições filtradas por Sistemas para conformidade com o Dashboard
  const groupedPrescriptions = useMemo(() => {
    const groups: Record<string, Prescription[]> = {};
    filteredPrescriptions.forEach((p) => {
      const key = formatSystemName(p.system || "Outros");
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(p);
    });
    return groups;
  }, [filteredPrescriptions]);

  return (
    <div className={`space-y-6 max-w-7xl mx-auto ${isDark ? "text-slate-100" : "text-slate-800"}`}>
      {/* Dashboard Top Panel with PDF Upload Zone */}
      <div className={`rounded-3xl border ${themeClasses.card} p-6 sm:p-8`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center space-x-2">
              <span className={`p-2 rounded-xl ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                <FileText className="w-5 h-5" />
              </span>
              <h1 className={`text-lg font-bold ${themeClasses.text}`}>Biblioteca Particular de Prescrições</h1>
            </div>
            <p className={`text-xs leading-relaxed md:pr-4 ${themeClasses.subText}`}>
              Crie condutas organizadas para o seu dia a dia clínico. Faça o upload de um arquivo **PDF com condutas ou diretrizes do seu hospital** para popular este Dashboard usando inteligência artificial de alta velocidade. A IA separará medicamentos, agrupará por sistemas clínicos, mapeará condicionais importantes e consolidará contraindicações de segurança de cada conduta.
            </p>
          </div>

          {/* Upload and Paste Zone Selector */}
          <div className="flex flex-col gap-4 w-full lg:max-w-md">
            {/* Segmented Control / Tab Switcher */}
            <div className={`p-1 rounded-xl flex ${isDark ? "bg-slate-950/80 border border-slate-800" : "bg-slate-100/80 border border-slate-200"}`}>
              <button
                type="button"
                onClick={() => setIsPastingText(false)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isPastingText
                    ? isDark ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40" : "bg-white text-slate-800 shadow-sm border border-slate-200"
                    : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Importar PDF
              </button>
              <button
                type="button"
                onClick={() => setIsPastingText(true)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isPastingText
                    ? isDark ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40" : "bg-white text-slate-800 shadow-sm border border-slate-200"
                    : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Copiar e Colar Texto
              </button>
            </div>

            {!isPastingText ? (
              <div className={`w-full ${isDark ? "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800" : "bg-slate-50 hover:bg-slate-100/70 border-slate-200"} border-2 border-dashed hover:border-emerald-400 rounded-2xl p-6 text-center transition-all relative flex flex-col justify-center items-center min-h-[140px]`}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePdfUpload}
                  accept="application/pdf"
                  className="hidden"
                />
                
                <div className="space-y-3 cursor-pointer w-full" onClick={() => fileInputRef.current?.click()}>
                  <div className={`w-11 h-11 rounded-xl shadow-sm flex items-center justify-center mx-auto ${isDark ? "bg-slate-800 text-emerald-400" : "bg-white text-emerald-600"}`}>
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`block text-xs font-bold ${themeClasses.text}`}>Escolha ou arraste o seu PDF clínico</span>
                    <span className={`block text-[10px] mt-0.5 ${themeClasses.subText}`}>Suporta PDFs normais ou institucionais até 40MB</span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTextSubmit} className="space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Cole aqui o texto ou trecho do PDF que deseja processar...&#10;&#10;Exemplo:&#10;DIRETRIZ DE ASMA NO PRONTO SOCORRO&#10;- Se leve: dar aerossol de Fenoterol 10 gotas + ipratrópio..."
                  className={`w-full min-h-[140px] p-3 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium ${themeClasses.input}`}
                  required
                />
                
                <div className="flex justify-end gap-2">
                  {pastedText && (
                    <button
                      type="button"
                      onClick={() => setPastedText("")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${isDark ? "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800"} cursor-pointer`}
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold ${themeClasses.primaryBtn} flex items-center gap-1.5 cursor-pointer`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Processar Texto de Conduta
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Progress feedback for extraction process */}
        {isProcessing && (
          <div className="mt-6 p-5 bg-emerald-50/50 border border-emerald-150 rounded-2xl animate-pulse space-y-3">
            <div className="flex items-center space-x-3 text-xs font-bold text-emerald-800">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Gerando Dashboard Clinico com IA...</span>
            </div>
            <p className="text-xs text-emerald-600 font-mono italic pl-7">{progressStep}</p>
            <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${themeClasses.progress} w-3/4`} />
            </div>
          </div>
        )}

        {/* Upload and analysis error display */}
        {uploadError && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-150 rounded-2xl text-xs text-rose-700 font-semibold space-y-1 relative">
            <button 
              onClick={() => setUploadError(null)}
              className="absolute right-3 top-3 text-rose-400 hover:text-rose-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Erro de Processamento</span>
            </div>
            <p className="pl-6 text-[11px] leading-relaxed text-rose-600">{uploadError}</p>
          </div>
        )}
      </div>

      {/* Database control metrics & filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input Filter */}
        <div className="relative w-full sm:max-w-md">
          <Search className={`w-4 h-4 absolute left-3.5 top-3.5 ${themeClasses.subText}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por sistema, conduta ou palavra-chave..."
            className={`w-full pl-10 pr-4 py-3 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium ${themeClasses.input}`}
          />
        </div>

        {/* Core Controls: Collapsible state selectors & Empty DB Seed Trigger or Wipe */}
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          {prescriptions.length > 0 && (
            <button
              onClick={handleOpenCreateModal}
              className={`text-[11px] font-bold px-3.5 py-2.5 rounded-xl border cursor-pointer border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 transition-all text-center flex items-center gap-1.5 shadow-sm ${isDark ? "bg-emerald-500/5" : "bg-white"}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Conduta Manual</span>
            </button>
          )}

          {prescriptions.length > 0 && (
            <button
              onClick={handleToggleAllSystems}
              className={`text-[11px] font-bold px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all text-center flex items-center gap-1.5 ${isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              title={allCollapsed ? "Expandir todos os sistemas" : "Minimizar todos os sistemas"}
            >
              {allCollapsed ? <Plus className="w-3.5 h-3.5 text-emerald-500" /> : <ChevronDown className={`w-3.5 h-3.5 ${themeClasses.subText}`} />}
              <span>{allCollapsed ? "Expandir Sistemas" : "Minimizar Sistemas"}</span>
            </button>
          )}

          {prescriptions.length === 0 && !isLoading && (
            <button
              onClick={handleLoadMockDemos}
              className="text-[11px] font-bold px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-350 cursor-pointer bg-white text-slate-600 hover:bg-slate-50 hover:-translate-y-0.5 transition-all text-center flex-1 sm:flex-none"
            >
              💡 Carregar Protótipo de Demonstração
            </button>
          )}

          {prescriptions.length > 0 && (
            <div className="flex items-center select-none">
              {!showWipeConfirm ? (
                <button
                  onClick={() => setShowWipeConfirm(true)}
                  className="text-[11px] font-bold px-4 py-2.5 rounded-xl border border-rose-150 text-rose-600 hover:bg-rose-50 cursor-pointer bg-white flex items-center justify-center space-x-2 flex-1 sm:flex-none"
                >
                  <Trash2 className="w-3.5 h-3.5 font-bold" />
                  <span>Apagar Biblioteca Completa</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200/80 rounded-xl p-1 px-3.5 animate-fade-in shadow-sm">
                  <span className="text-[10px] text-rose-800 font-extrabold shrink-0">Apagar tudo?</span>
                  <button
                    onClick={handleWipeLibrary}
                    className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-750 cursor-pointer shadow-sm shadow-rose-500/10 transition-colors"
                  >
                    Sim, apagar
                  </button>
                  <button
                    onClick={() => setShowWipeConfirm(false)}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-200 text-slate-750 hover:bg-slate-300 cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main dashboard visualization area */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" />
          <p className="text-xs text-slate-400 font-mono italic mt-3">Carregando condutas clínicas salvas...</p>
        </div>
      ) : Object.keys(groupedPrescriptions).length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center max-w-xl mx-auto space-y-5 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
            <Clipboard className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Biblioteca Particular Vazia</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Você ainda não possui nenhuma prescrição extraída no seu perfil médico privado. Utilize a caixa superior para anexar um PDF institucional de protocolos médicos, ou clique no botão abaixo para preencher com exemplos ricos de demonstração de IC Descompensada, Sepse e Crise de Asma.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center space-x-2 py-3 px-5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm cursor-pointer hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Nova Conduta Manualmente</span>
          </button>
          
          <button
            onClick={handleLoadMockDemos}
            className="inline-flex items-center space-x-2 py-3 px-5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow-sm cursor-pointer hover:-translate-y-0.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Preencher Biblioteca de Demonstração</span>
          </button>
        </div>
      ) : (
        /* Bento Dashboard categorized lists of Systems */
        <div className="space-y-8 animate-fade-in">
          {(Object.entries(groupedPrescriptions) as [string, Prescription[]][]).map(([system, items]) => {
            const isCollapsed = !!collapsedSystems[system];
            return (
              <div key={system} className="space-y-4">
                {/* Clinical System header */}
                <div 
                  onClick={() => toggleSystemCollapse(system)}
                  className={`flex items-center justify-between pb-1.5 border-b cursor-pointer p-1.5 rounded-xl transition-all group select-none ${isDark ? "border-slate-800 hover:bg-slate-900/50" : "border-slate-200 hover:bg-slate-50/80"}`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h2 className={`text-sm font-bold uppercase tracking-wider font-mono ${themeClasses.text}`}>
                      {system}
                    </h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100/80 text-slate-500"}`}>
                      {items.length} {items.length === 1 ? "conduta" : "condutas"}
                    </span>
                  </div>

                  <div className={`transition-colors flex items-center gap-1 text-xs ${themeClasses.subText} group-hover:text-emerald-400`}>
                    <span className="text-[10px] font-medium font-mono transition-opacity">
                      {isCollapsed ? "Expandir" : "Recolher"}
                    </span>
                    {isCollapsed ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                  </div>
                </div>

                {/* Grid of Prescription Cards */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 animate-fade-in">
                    {items.map((p) => {
                      // Agrupar itens desta prescrição pelo seu respectivo conditionGroup
                      const itemsByGroup: Record<string, typeof p.items> = {};
                      p.items.forEach((it) => {
                        const group = it.conditionGroup?.trim() || "Medidas Gerais";
                        if (!itemsByGroup[group]) {
                          itemsByGroup[group] = [];
                        }
                        itemsByGroup[group].push(it);
                      });

                      return (
                        <div 
                          key={p.id} 
                          className={`rounded-2xl border transition-all flex flex-col justify-between p-5 sm:p-6 space-y-5 ${themeClasses.card} hover:border-emerald-500/50`}
                        >
                          <div className="space-y-4">
                            {/* Title area & quick actions */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${isDark ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                                  {p.condition}
                                </span>
                                <h3 className={`font-sans font-bold text-sm leading-snug ${themeClasses.text}`}>
                                  {p.title}
                                </h3>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0 select-none">
                                {/* Copy trigger button */}
                                <button
                                  title="Copiar prescrição completa"
                                  onClick={() => handleCopyPrescription(p)}
                                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                                    copiedId === p.id 
                                      ? "bg-slate-750 text-white border-transparent" 
                                      : `${isDark ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-400" : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`
                                  }`}
                                >
                                  {copiedId === p.id ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                                </button>

                                {/* Edit trigger button */}
                                <button
                                  title="Editar conduta"
                                  onClick={() => handleOpenEditModal(p)}
                                  className={`p-2 border rounded-lg transition-all cursor-pointer ${isDark ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50" : "bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-150 text-slate-400 hover:text-emerald-600"}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete single trigger button */}
                                {prescriptionToDelete === p.id ? (
                                  <div className={`flex items-center space-x-1 border rounded-lg p-0.5 animate-fade-in shrink-0 relative z-10 ${isDark ? "bg-rose-950/20 border-rose-900/50" : "bg-rose-50 border-rose-150"}`}>
                                    <span className="text-[9px] text-rose-500 font-extrabold px-1">Apagar?</span>
                                    <button
                                      onClick={() => handleDeleteSingle(p.id)}
                                      className="text-[9px] font-extrabold px-1.5 py-0.5 bg-rose-600 text-white rounded hover:bg-rose-700 cursor-pointer transition-colors"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      onClick={() => setPrescriptionToDelete(null)}
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-200 text-slate-700 hover:bg-slate-350"}`}
                                    >
                                      Não
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    title="Excluir conduta"
                                    onClick={() => setPrescriptionToDelete(p.id)}
                                    className={`p-2 border rounded-lg transition-all cursor-pointer shrink-0 ${isDark ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/50" : "bg-white border-slate-200 hover:bg-rose-50 hover:border-rose-150 text-slate-400 hover:text-rose-600"}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* List of items structured grouped dynamically by conditions/groups */}
                            <div className={`space-y-4 pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                              {Object.entries(itemsByGroup).map(([groupName, groupItems], gIdx) => (
                                <div key={groupName} className="space-y-2">
                                  {/* Centered highlighted condition group header row if not empty or matches clinical patterns */}
                                  <div className="flex items-center justify-center py-1">
                                    <span className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-150"}`} />
                                    <span className={`mx-3 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border shadow-sm select-none inline-flex items-center space-x-1 ${
                                      groupName.toLowerCase().includes("instável") || groupName.toLowerCase().includes("urgência") || groupName.toLowerCase().includes("refratário")
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : groupName.toLowerCase().includes("estável") || groupName.toLowerCase().includes("geral") || groupName.toLowerCase().includes("manutenção")
                                        ? "bg-sky-50 text-sky-700 border-sky-150"
                                        : `${isDark ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"}`
                                    }`}>
                                      {groupName}
                                    </span>
                                    <span className={`h-px flex-1 ${isDark ? "bg-slate-800" : "bg-slate-150"}`} />
                                  </div>

                                  <ul className="space-y-2 pl-2">
                                    {groupItems.map((it, itIdx) => (
                                      <li key={itIdx} className={`flex items-start text-xs leading-relaxed font-mono ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                        <span className="text-emerald-500 mr-2 select-none font-bold font-sans">•</span>
                                        <span>{it.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Display safety warnings/contraindications at the footer if any */}
                          {p.contraindications && (
                            <div className={`mt-4 p-3 border rounded-xl space-y-1 ${isDark ? "bg-amber-950/20 border-amber-900/40" : "bg-amber-50/50 border-amber-150"}`}>
                              <div className={`flex items-center space-x-2 text-[10px] font-extrabold uppercase tracking-widest font-mono select-none ${isDark ? "text-amber-400" : "text-amber-700"}`}>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                <span>Contraindicações & Cuidados</span>
                              </div>
                              <p className={`text-[11px] leading-relaxed font-sans ${isDark ? "text-amber-200/80" : "text-amber-800"}`}>
                                {p.contraindications}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Creation/Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)} />
          
          <div className={`${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"} w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50/50 border-slate-100"}`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${editingPrescription ? (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600") : (isDark ? "bg-sky-500/10 text-sky-400" : "bg-sky-50 text-sky-600")}`}>
                  {editingPrescription ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className={`text-sm font-bold ${themeClasses.text}`}>
                    {editingPrescription ? "Editar Conduta Clínica" : "Criar Nova Conduta Clínica"}
                  </h2>
                  <p className={`text-[10px] font-medium font-mono ${themeClasses.subText}`}>
                    {editingPrescription ? `ID: ${editingPrescription.id}` : "Preencha os campos abaixo para adicionar à sua biblioteca"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-200 text-slate-400"}`}
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <form id="prescription-form" onSubmit={handleSavePrescription} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider ml-1 ${themeClasses.subText}`}>Sistema Clínico</label>
                    <input
                      required
                      type="text"
                      list="systems-list"
                      className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${themeClasses.input}`}
                      placeholder="Ex: Cardiovascular, Respiratório..."
                      value={formState.system}
                      onChange={(e) => setFormState(prev => ({ ...prev, system: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider ml-1 ${themeClasses.subText}`}>Condição Clínica</label>
                    <input
                      type="text"
                      list="conditions-list"
                      className={`w-full px-4 py-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${themeClasses.input}`}
                      placeholder="Ex: IC Descompensada (Perfil B)..."
                      value={formState.condition}
                      onChange={(e) => setFormState(prev => ({ ...prev, condition: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[11px] font-extrabold uppercase tracking-wider ml-1 ${themeClasses.subText}`}>Título da Prescrição</label>
                  <input
                    required
                    type="text"
                    className={`w-full px-4 py-2.5 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all ${themeClasses.input}`}
                    placeholder="Ex: Manejo de Congestão Pulmonar..."
                    value={formState.title}
                    onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                {/* Items Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <label className={`text-[11px] font-extrabold uppercase tracking-wider ${themeClasses.subText}`}>Itens da Conduta (Medicamentos/Ações)</label>
                    <button
                      type="button"
                      onClick={handleAddFormItem}
                      className={`text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-colors flex items-center gap-1.5 ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-900/50 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Item</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                    {formState.items.map((item, idx) => (
                      <div key={idx} className={`p-4 border rounded-2xl flex flex-col md:flex-row gap-3 relative group ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50/50 border-slate-150"}`}>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            list="groups-list"
                            className={`w-full px-3 py-1.5 border rounded-lg text-[10px] font-bold outline-none ${isDark ? "bg-slate-950 border-slate-800 text-slate-300 focus:border-emerald-500" : "bg-white border-slate-200 text-slate-600 focus:border-emerald-500"}`}
                            placeholder="Grupo (ex: Instável, Estável, Geral...)"
                            value={item.conditionGroup || ""}
                            onChange={(e) => handleUpdateFormItem(idx, "conditionGroup", e.target.value)}
                          />
                          <textarea
                            required
                            rows={2}
                            className={`w-full px-3 py-2 border rounded-lg text-xs outline-none resize-none font-mono ${isDark ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500" : "bg-white border-slate-200 text-slate-700 focus:border-emerald-500"}`}
                            placeholder="Texto da conduta, dose, via..."
                            value={item.text}
                            onChange={(e) => handleUpdateFormItem(idx, "text", e.target.value)}
                          />
                        </div>
                        {formState.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFormItem(idx)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 flex items-center justify-center h-fit mt-1"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[11px] font-extrabold uppercase tracking-wider ml-1 ${themeClasses.subText}`}>Contraindicações & Cuidados</label>
                  <textarea
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none ${themeClasses.input}`}
                    placeholder="Ex: Evitar betabloqueadores em caso de asma ativa..."
                    value={formState.contraindications}
                    onChange={(e) => setFormState(prev => ({ ...prev, contraindications: e.target.value }))}
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                form="prescription-form"
                type="submit"
                disabled={isSaving}
                className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${themeClasses.primaryBtn}`}
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{editingPrescription ? "Salvar Alterações" : "Criar Conduta"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Datalists for autocompletion */}
      <datalist id="systems-list">
        {autocompleteData.systems.map(sys => <option key={sys} value={sys} />)}
      </datalist>
      <datalist id="conditions-list">
        {autocompleteData.conditions.map(cond => <option key={cond} value={cond} />)}
      </datalist>
      <datalist id="groups-list">
        {autocompleteData.groups.map(group => <option key={group} value={group} />)}
      </datalist>
    </div>
  );
}
