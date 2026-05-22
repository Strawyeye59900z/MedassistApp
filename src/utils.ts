import { Exam, TranscriptionResponse, AppSettings } from "./types";

/**
 * Formats a single exam item into the standard shorthand Medical structure requested.
 */
export function formatExam(exam: Exam, settings: AppSettings): string {
  const { separator, capsLock } = settings;
  const sep = ` ${separator} `;

  // Format findings with their sub-items
  const formattedFindings = exam.findings
    .map((finding) => {
      let mainText = `${finding.label} ${finding.value}`;
      if (finding.subItems && finding.subItems.length > 0) {
        const subText = finding.subItems
          .map((sub) => `${sub.label} ${sub.value}`)
          .join(sep);
        mainText += ` [ ${subText} ]`;
      }
      return mainText;
    })
    .join(sep);

  // Set the prefix title: LAB, Sumário de urina, Gasometria arterial/venosa, or custom title for "Outro"
  let title: string = exam.category;
  if (exam.category === "Outro" && exam.customTitle) {
    title = exam.customTitle;
  }

  const line = `- ${title} ${exam.date}: ${formattedFindings}`;
  return capsLock ? line.toUpperCase() : line;
}

/**
 * Synthesizes multiple processed exams into a cohesive list form separated by newlines.
 */
export function formatAllExams(data: TranscriptionResponse, settings: AppSettings): string {
  if (!data.exams || data.exams.length === 0) {
    return "";
  }
  return data.exams.map((exam) => formatExam(exam, settings)).join("\n");
}

/**
 * Returns the default settings state.
 */
export function getDefaultSettings(): AppSettings {
  return {
    separator: "|",
    capsLock: false,
    theme: "dark-emerald",
    accentTone: "#10b981", // Emerald 500 default
  };
}

/**
 * Highly realistic lab result sheet copy, allowing physicians to test the applet immediately.
 */
export const CLINICAL_MOCK_EXAM_TEXT = `LABORATÓRIO CENTRAL HOSPITALAR
Nome do Paciente: Dr. Francisco de Assis Santos
Data de Coleta: 18/05/2026
---------------------------------------------
HEMOGRAMA COMPLETO
Hemoglobina (Hb): 10,2 g/dL   | Hematócrito (Ht): 31,5 %
VCM: 81,0 fL                  | HCM: 27,0 pg
Leucócitos: 10.500 /mm³
Linfócitos: 3.150 /mm³ ( 30,0 % )
Monócitos: 1.050 /mm³ ( 10,0 % )
Plaquetas: 145.000 /mm³

BIOQUÍMICA
Creatinina: 0,9 mg/dL
Uréia: 42 mg/dL
Glicose de jejum: 98 mg/dL
Sódio (Na): 138 mEq/L
Potássio (K): 4,2 mEq/L

SUMÁRIO DE URINA (EAS) - Realizado em 18/05/2026
pH: 7,0
Glicose: inferior a 10 mg/dL (Normal)
Proteínas: Ausente
Densidade: 1.015
Nitrito: Negativo

GASOMETRIA ARTERIAL - Realizado em 18/05/2026 - 14:30
pH: 7,37
pCO2: 32 mmHg
pO2: 88 mmHg
HCO3: 21 mEq/L
B.E. (Base Excess): -1,5 mEq/L
Sat O2: 96 %`;

export interface RefRange {
  min: number;
  max: number;
  unit: string;
}

export const REFERENCE_RANGES: Record<string, RefRange> = {
  // Hemograma
  "hb": { min: 12.0, max: 17.5, unit: "g/dL" },
  "hemoglobina": { min: 12.0, max: 17.5, unit: "g/dL" },
  "ht": { min: 36.0, max: 50.0, unit: "%" },
  "hematocrito": { min: 36.0, max: 50.0, unit: "%" },
  "hematócrito": { min: 36.0, max: 50.0, unit: "%" },
  "vcm": { min: 80.0, max: 100.0, unit: "fL" },
  "hcm": { min: 26.0, max: 34.0, unit: "pg" },
  "leuco": { min: 4000, max: 11000, unit: "/mm³" },
  "leucocitos": { min: 4000, max: 11000, unit: "/mm³" },
  "leucócitos": { min: 4000, max: 11000, unit: "/mm³" },
  "plaquetas": { min: 150000, max: 450000, unit: "/mm³" },
  "plaq": { min: 150000, max: 450000, unit: "/mm³" },
  "linf": { min: 900, max: 4000, unit: "/mm³" },
  "linfócitos": { min: 900, max: 4000, unit: "/mm³" },
  "mon": { min: 100, max: 1000, unit: "/mm³" },
  "monócitos": { min: 100, max: 1000, unit: "/mm³" },
  "neut": { min: 1600, max: 7000, unit: "/mm³" },
  "neutrófilos": { min: 1600, max: 7000, unit: "/mm³" },
  "bast": { min: 0, max: 5.0, unit: "%" },
  "bastonetes": { min: 0, max: 5.0, unit: "%" },
  "seg": { min: 40, max: 70, unit: "%" },
  "segmentados": { min: 40, max: 70, unit: "%" },

  // Bioquímica
  "creat": { min: 0.6, max: 1.2, unit: "mg/dL" },
  "creatinina": { min: 0.6, max: 1.2, unit: "mg/dL" },
  "ureia": { min: 15.0, max: 45.0, unit: "mg/dL" },
  "uréia": { min: 15.0, max: 45.0, unit: "mg/dL" },
  "glicose": { min: 70.0, max: 99.0, unit: "mg/dL" },
  "na": { min: 135.0, max: 145.0, unit: "mEq/L" },
  "sodio": { min: 135.0, max: 145.0, unit: "mEq/L" },
  "sódio": { min: 135.0, max: 145.0, unit: "mEq/L" },
  "k": { min: 3.5, max: 5.0, unit: "mEq/L" },
  "potassio": { min: 3.5, max: 5.0, unit: "mEq/L" },
  "potássio": { min: 3.5, max: 5.0, unit: "mEq/L" },
  "pcr": { min: 0.0, max: 5.0, unit: "mg/L" },

  // Gasometria
  "ph": { min: 7.35, max: 7.45, unit: "" },
  "pco2": { min: 35.0, max: 45.0, unit: "mmHg" },
  "po2": { min: 80.0, max: 100.0, unit: "mmHg" }, // Arterial default
  "hco3": { min: 22.0, max: 26.0, unit: "mEq/L" },
  "be": { min: -2.0, max: 2.0, unit: "mEq/L" },
  "sato2": { min: 94.0, max: 100.0, unit: "%" },

  // Urina (EAS)
  "densidade": { min: 1.005, max: 1.030, unit: "" },
};

export function parseCleanNumber(valStr: string, label: string): number | null {
  if (!valStr) return null;
  let str = valStr.trim().toLowerCase();
  
  // Remove percentages and spaces
  str = str.replace(/%/g, '');
  
  const lowerLabel = label.toLowerCase();
  const isThousandsField = ["leuco", "leucocitos", "leucócitos", "plaquetas", "plaq", "linf", "linfócitos", "mon", "monócitos", "neut", "neutrófilos"].some(term => lowerLabel.includes(term));
  
  // PT-BR decimals support
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(/,/g, '.');
  } else if (str.includes(',')) {
    str = str.replace(/,/g, '.');
  } else if (str.includes('.')) {
    if (isThousandsField) {
      const parts = str.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        str = str.replace(/\./g, "");
      }
    }
  }
  
  str = str.replace(/[^\d\.\-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function checkIfAltered(label: string, valueStr: string): { isAltered: boolean; reference: string } {
  if (!label || !valueStr) return { isAltered: false, reference: "" };
  const normLabel = label.trim().toLowerCase();
  
  let ref = REFERENCE_RANGES[normLabel];
  let foundKey = normLabel;
  
  if (!ref) {
    const k = Object.keys(REFERENCE_RANGES).find(key => normLabel.includes(key) || key.includes(normLabel));
    if (k) {
      ref = REFERENCE_RANGES[k];
      foundKey = k;
    }
  }
  
  if (!ref) {
    return { isAltered: false, reference: "" };
  }
  
  const parsed = parseCleanNumber(valueStr, label);
  if (parsed !== null) {
    // If the value ends with '%' or label indicates percentage, adjust range comparison slightly
    // For lymphocytes, standard range is 900-4000 /mm3 but if they are expressed in % they are between 20% and 40%
    let minVal = ref.min;
    let maxVal = ref.max;
    if (foundKey === "linf" || foundKey === "linfócitos") {
      if (valueStr.includes("%") || parsed <= 100) {
        minVal = 20;
        maxVal = 40;
        ref = { min: 20, max: 40, unit: "%" };
      }
    } else if (foundKey === "mon" || foundKey === "monócitos") {
      if (valueStr.includes("%") || parsed <= 100) {
        minVal = 2;
        maxVal = 10;
        ref = { min: 2, max: 10, unit: "%" };
      }
    } else if (foundKey === "neut" || foundKey === "neutrófilos") {
      if (valueStr.includes("%") || parsed <= 100) {
        minVal = 45;
        maxVal = 75;
        ref = { min: 45, max: 75, unit: "%" };
      }
    }
    
    const isAltered = parsed < minVal || parsed > maxVal;
    const separatorDigit = ref.unit === "%" ? "%" : (" " + ref.unit).trim();
    const rangeText = `${minVal} - ${maxVal} ${separatorDigit}`;
    return { isAltered, reference: rangeText.trim() };
  }
  
  return { isAltered: false, reference: "" };
}
