export interface SubItem {
  label: string;
  value: string;
  originalLabel?: string;
}

export interface Finding {
  label: string;
  value: string;
  subItems?: SubItem[];
  originalLabel?: string;
}

export interface Exam {
  category: "LAB" | "Sumário de urina" | "Gasometria arterial" | "Gasometria venosa" | "Outro";
  customTitle?: string;
  date: string; // format DD/MM/YY
  findings: Finding[];
}

export interface TranscriptionResponse {
  patientName: string;
  exams: Exam[];
}

export interface HistoryItem {
  id: string;
  timestamp: string; // ISO string
  patientName: string;
  rawInput: string;
  parsedData: TranscriptionResponse;
  formattedText: string;
}

export interface AppSettings {
  separator: string; // e.g. " | " or " / "
  capsLock: boolean;
  theme: "light" | "charcoal" | "hospital" | "emerald" | "dark-emerald" | "midnight";
  accentTone?: string; // Hex color or a class-related tone mapping
  geminiApiKey?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: string; // ISO string
  ward?: string;
  room?: string;
}

export interface PrescriptionItem {
  conditionGroup?: string;
  text: string;
}

export interface Prescription {
  id: string;
  system: string;
  condition: string;
  title: string;
  items: PrescriptionItem[];
  contraindications?: string;
  timestamp: string; // ISO string
}

export interface Correction {
  original: string;
  shorthand: string;
  updatedAt: string;
}

