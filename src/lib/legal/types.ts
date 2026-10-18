export type DocumentKind = "pdf" | "docx" | "txt";
export type RiskLevel = "review" | "attention" | "informational";

export interface Finding {
  id: string;
  category: string;
  level: RiskLevel;
  title: string;
  detail: string;
  evidence: string;
  page?: number;
}

export interface KeyTerm {
  label: string;
  value: string;
  evidence: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ReviewDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  category: string;
  createdAt: number;
  updatedAt: number;
  size: number;
  text: string;
  pages: string[];
  terms: KeyTerm[];
  findings: Finding[];
  checklist: ChecklistItem[];
}

export interface StoredPreferences {
  id: "main";
  language: string;
  rememberHistory: boolean;
}