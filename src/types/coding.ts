export interface CodingRequest {
  clinical_input: string;
  laterality: string;
  patient_type: string;
  setting: string;
  time_spent: string;
}

export interface PrimaryCode {
  cpt_code: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

export interface Alternative {
  cpt_code: string;
  description: string;
  why_consider: string;
}

export interface ICD10Code {
  code: string;
  description: string;
  necessity: string;
}

export interface Modifier {
  code: string;
  name: string;
  apply: boolean;
  reason: string;
}

export interface CodingWarning {
  type: "error" | "warning" | "info";
  message: string;
}

export interface CodingResult {
  primary_code: PrimaryCode;
  alternatives: Alternative[];
  icd10_codes: ICD10Code[];
  modifiers: Modifier[];
  rationale: string;
  missing_information: string[];
  warnings: CodingWarning[];
  clean_claim_ready: boolean;
}

export interface CodingError {
  error: true;
  error_code: string;
  error_message: string;
  user_message: string;
}
