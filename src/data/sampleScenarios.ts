import type { ValidationFormData } from "@/components/ValidationForm";

export interface SampleScenario {
  label: string;
  description: string;
  icon: string;
  expectedOutcome: "clean" | "issues";
  data: ValidationFormData;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    label: "Clean Knee Arthroscopy",
    description: "Single procedure, correct modifier, commercial payer — should pass all checks.",
    icon: "check_circle",
    expectedOutcome: "clean",
    data: {
      cptCodes: ["29881"],
      modifiers: ["RT"],
      dateOfService: today(),
      icd10Code: "M23.211",
      patientAge: 52,
      laterality: "right",
      payerType: "commercial",
      priorSurgeryCpt: "",
      priorSurgeryDate: "",
    },
  },
  {
    label: "PTP Bundling Violation",
    description: "TKA + arthroscopy billed together without modifier — PTP should flag this.",
    icon: "error",
    expectedOutcome: "issues",
    data: {
      cptCodes: ["27447", "29881"],
      modifiers: [],
      dateOfService: today(),
      icd10Code: "M17.11",
      patientAge: 68,
      laterality: "right",
      payerType: "medicare",
      priorSurgeryCpt: "",
      priorSurgeryDate: "",
    },
  },
  {
    label: "MUE Limit Exceeded",
    description: "Major joint injection billed 3x — MUE limit is 1 per encounter.",
    icon: "warning",
    expectedOutcome: "issues",
    data: {
      cptCodes: ["20610", "20610", "20610"],
      modifiers: [],
      dateOfService: today(),
      icd10Code: "M25.561",
      patientAge: 71,
      laterality: "right",
      payerType: "medicare",
      priorSurgeryCpt: "",
      priorSurgeryDate: "",
    },
  },
  {
    label: "Global Period Conflict",
    description: "Office visit 10 days after knee replacement — within the 90-day global window.",
    icon: "schedule",
    expectedOutcome: "issues",
    data: {
      cptCodes: ["99213"],
      modifiers: [],
      dateOfService: today(),
      icd10Code: "M17.11",
      patientAge: 65,
      laterality: "right",
      payerType: "medicare",
      priorSurgeryCpt: "27447",
      priorSurgeryDate: daysAgo(10),
    },
  },
];
