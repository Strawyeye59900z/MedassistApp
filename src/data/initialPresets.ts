export const INITIAL_PRESETS = [
  {
    id: "preset_default_01",
    name: "Protocolos Cardiovasculares e Críticos",
    prescriptions: [
      {
        "system": "SISTEMA CARDIOVASCULAR",
        "condition": "ARRITMIAS",
        "title": "TAQUICARDIA SUPRAVENTRICULAR",
        "contraindications": "Evitar uso de Adenosina em pacientes com doenças pulmonares descompensadas (asma/DPOC). Pacientes que apresentaram bloqueio atrioventricular (AV) de qualquer grau não devem receber doses adicionais. Casos extremos de administração inadequada ou superdosagem podem cursar com assistolia ou fibrilação ventricular.",
        "items": [
          { "conditionGroup": "Estável hemodinamicamente", "text": "Manobras vasovagais (como manobra de Valsalva modificada ou massagem do seio carotídeo) podem ser utilizadas inicialmente e possuem potencial de reverter o quadro sem a necessidade de intervenção medicamentosa imediata." },
          { "conditionGroup": "Estável hemodinamicamente", "text": "Adenosina (6mg/2ml) - 01 Ampola (dose 6mg): Administrar em bólus por via intravenosa de forma rápida, imediatamente seguida por um flush de 20ml de Solução Fisiológica (SF) 0,9% e elevação concomitante do membro em que foi realizada a infusão. Deve ser aplicada preferencialmente na fossa cubital, evitando acessos venosos periféricos distais. Na ausência de reversão do quadro após 1 a 2 minutos, dobrar a dose para Adenosina (6mg/2ml) - 02 Ampolas (dose 12mg) EV em bólus rápido." },
          { "conditionGroup": "Estável hemodinamicamente (Opção de Segunda Linha)", "text": "Metoprolol (5mg/5ml) - 01 ampola (dose 5mg): Dose inicial de 2,5 mg a 5 mg em bólus intravenoso lento, na velocidade de 1 mg/minuto. Pode ser repetido a intervalos regulares até o controle adequado da frequência cardíaca, respeitando a dose máxima cumulativa de 15 mg (equivalente a 03 ampolas)." },
          { "conditionGroup": "Instável hemodinamicamente", "text": "Pacientes que manifestem sinais clínicos de instabilidade hemodinâmica (definidos por hipotensão arterial ou sinais francos de choque circulatório, rebaixamento agudo do nível de consciência, dor torácica de padrão anginoso ou dispneia incapacitante de origem cardíaca) devem ser submetidos de imediato à cardioversão elétrica sincronizada." }
        ]
      },
      {
        "system": "SISTEMA CARDIOVASCULAR",
        "condition": "ARRITMIAS",
        "title": "TAQUICARDIA VENTRICULAR",
        "contraindications": "O tratamento com Amiodarona ou Lidocaína deve ser imediatamente descontinuado ou suspenso caso ocorra o aparecimento de bloqueio atrioventricular (AV) de qualquer grau ou bradicardia severa.",
        "items": [
          { "conditionGroup": "Estável hemodinamicamente", "text": "Dose de ataque: Amiodarona (150mg/3ml) - 01 ampola (dose de 150mg). Diluir 1 ampola em 100ml de Soro Glicosado (SGI) 5% e infundir por via intravenosa no período de 30 minutos." },
          { "conditionGroup": "Estável hemodinamicamente", "text": "Dose de impregnação/manutenção: Amiodarona (150mg/3ml) - 03 ampolas (dose total de 450mg). Diluir as 3 ampolas em 230ml de SGI 5% e infundir por meio de Bomba de Infusão Contínua (BIC) na velocidade de 16 ml/h durante as primeiras 6 horas (equivalente a 1 mg/min) e reduzir para 8 ml/h nas próximas 18 horas (equivalente a 0,5 mg/min)." },
          { "conditionGroup": "Estável hemodinamicamente (Opções em caso de falha da Amiodarona)", "text": "Lidocaína 2% (20mg/ml) - 01 ampola (400mg): Administrar dose de ataque de 1,5 mg/kg por via intravenosa lenta. Em caso de refratariedade ou persistência da arritmia, repetir nova dose de 0,5 mg/kg. Respeitar o limite de dose máxima cumulativa de 3 mg/kg a 4 mg/kg." },
          { "conditionGroup": "Tratamento ambulatorial / Manutenção pós-crise", "text": "Metoprolol (apresentações de 25mg, 50mg ou 100mg) - comprimidos: Iniciar com a dose de 25 mg por via oral (VO) a cada 24 horas. Progredir de forma gradual conforme tolerância clínica do paciente até atingir a dose alvo terapêutica de 100 mg a 200 mg VO a cada 24 horas." },
          { "conditionGroup": "Instável hemodinamicamente", "text": "Na presença de critérios de instabilidade hemodinâmica (hipotensão, choque, alteração do estado mental, dor torácica anginosa ou insuficiência respiratória aguda), realizar de imediato a cardioversão elétrica sincronizada precedida de sedação se o nível de consciência permitir." }
        ]
      },
      {
        "system": "SISTEMA CARDIOVASCULAR",
        "condition": "ARRITMIAS",
        "title": "FIBRILAÇÃO ATRIAL E FLUTTER ATRIAL",
        "contraindications": "É terminantemente proibido proceder com a cardioversão (química ou elétrica) em pacientes portadores de Fibrilação Atrial crônica ou com tempo de início superior a 48 horas (ou de tempo indeterminado) sem a prévia exclusão de trombos no átrio esquerdo via ecocardiograma transesofágico ou sem anticoagulação terapêutica por no mínimo 3 semanas.",
        "items": [
          { "conditionGroup": "Estável hemodinamicamente (Cardioversão química)", "text": "Amiodarona 150mg/3ml: Administrar dose de ataque calculada em 5 mg/kg a 7 mg/kg diluída em 100 ml de SGI 5% por via intravenosa em um período de 30 a 60 minutos. Dose de manutenção: Diluir 18ml (equivalente a 06 ampolas) em 482 ml de SGI 5% para infusão em BIC; programar a velocidade de 33 ml/h (1 mg/min) nas primeiras 6 horas e reduzir para 16,6 ml/h (0,5 mg/min) pelas 18 horas subsequentes." },
          { "conditionGroup": "Estável hemodinamicamente (Controle de Frequência - Betabloqueador)", "text": "Metoprolol 5mg/5ml: Administrar 1 ampola (5mg) por via intravenosa direta no tempo de 2 minutos. Pode ser repetida a cada 5 minutos de acordo com a resposta cronotrópica, até o limite de dose máxima de 20 mg (equivalente a 04 ampolas)." },
          { "conditionGroup": "Estável hemodinamicamente (Controle de Frequência - Bloqueador de Canal de Cálcio)", "text": "Verapamil 5mg/2ml: Administrar 1 a 2 ampolas (5mg a 10mg) por via intravenosa lenta no período de 2 a 5 minutos. Pode ser repetida após 30 minutos na ausência de resposta ideal, respeitando a dose máxima de 20 mg (04 ampolas). Seguir com terapia de manutenção por via oral na dose de 80 mg a 160 mg VO de 8/8 horas." },
          { "conditionGroup": "Estável hemodinamicamente (Controle de Frequência - Digitálicos)", "text": "Deslanosídeo 0,4mg/2ml: Administrar de 01 a 02 ampolas por via intravenosa de forma lenta ao longo de 24 horas (opção em pacientes com disfunção sistólica grave concomitante)." },
          { "conditionGroup": "Após estabilização ou Cardioversão (Manutenção ambulatorial)", "text": "Para manutenção do ritmo sinusal pós-cardioversão: Em pacientes portadores de insuficiência cardíaca estrutural, preferir Amiodarona 100 mg, administrando 03 comprimidos (300mg) VO de 12/12 horas. Em pacientes sem qualquer cardiopatia estrutural de base, utilizar Propafenona 300 mg, administrando 01 comprimido VO de 12/12 horas." },
          { "conditionGroup": "Instável hemodinamicamente", "text": "Proceder imediatamente à cardioversão elétrica sincronizada utilizando carga recomendada pelo fabricante conforme as diretrizes de suporte avançado de vida em cardiologia (ACLS)." }
        ]
      }
    ],
    createdAt: new Date().toISOString()
  }
];
