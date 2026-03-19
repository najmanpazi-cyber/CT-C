import { useState } from "react";

export interface ValidationFormData {
  cptCodes: string[];
  modifiers: string[];
  dateOfService: string;
  icd10Code: string;
  patientAge: number | null;
}

const VALID_MODIFIERS = [
  "25", "26", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
  "62", "66", "73", "74", "76", "77", "78", "79", "80", "81", "82",
  "LT", "RT", "TC", "XE", "XS", "XP", "XU", "24",
];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ValidationFormProps {
  onSubmit: (data: ValidationFormData) => void;
  submitting?: boolean;
}

export default function ValidationForm({ onSubmit, submitting = false }: ValidationFormProps) {
  const [cptInput, setCptInput] = useState("");
  const [modifierInput, setModifierInput] = useState("");
  const [dateOfService, setDateOfService] = useState(todayString());
  const [icd10Code, setIcd10Code] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};

    // CPT codes — required, 5-digit numbers
    const rawCpts = cptInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (rawCpts.length === 0) {
      errs.cpt = "At least one CPT code is required.";
    } else {
      for (const code of rawCpts) {
        if (!/^\d{5}$/.test(code)) {
          errs.cpt = `"${code}" is not a valid 5-digit CPT code.`;
          break;
        }
      }
    }

    // Modifiers — optional, must be valid 2-char codes
    if (modifierInput.trim()) {
      const rawMods = modifierInput.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      for (const mod of rawMods) {
        if (!VALID_MODIFIERS.includes(mod)) {
          errs.modifiers = `"${mod}" is not a recognized modifier.`;
          break;
        }
      }
    }

    // Date of service — required, not in the future
    if (!dateOfService) {
      errs.dos = "Date of service is required.";
    } else if (dateOfService > todayString()) {
      errs.dos = "Date of service cannot be in the future.";
    }

    // ICD-10 — optional, validate format if provided
    if (icd10Code.trim()) {
      if (!/^[A-Z]\d{2,3}(\.\d{1,4})?$/i.test(icd10Code.trim())) {
        errs.icd10 = "Invalid ICD-10 format. Example: M17.11";
      }
    }

    // Patient age — optional, 0-120
    if (patientAge.trim()) {
      const age = parseInt(patientAge, 10);
      if (isNaN(age) || age < 0 || age > 120) {
        errs.age = "Age must be between 0 and 120.";
      }
    }

    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length > 0) return;

    const cptCodes = cptInput.split(",").map((s) => s.trim()).filter(Boolean);
    const modifiers = modifierInput.trim()
      ? modifierInput.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : [];
    const age = patientAge.trim() ? parseInt(patientAge, 10) : null;

    onSubmit({
      cptCodes,
      modifiers,
      dateOfService,
      icd10Code: icd10Code.trim().toUpperCase(),
      patientAge: age,
    });
  }

  function handleClear() {
    setCptInput("");
    setModifierInput("");
    setDateOfService(todayString());
    setIcd10Code("");
    setPatientAge("");
    setErrors({});
  }

  return (
    <div className="rounded-2xl border border-cv-outline-variant/20 bg-cv-surface-container-lowest p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-cv-secondary/10 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-cv-secondary text-xl">fact_check</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-cv-on-surface">Validate Claim</h2>
          <p className="text-xs text-cv-on-surface-variant">Enter claim data to run all validation modules</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* CPT Codes */}
        <div>
          <label htmlFor="cpt-codes" className="block text-sm font-semibold text-cv-on-surface mb-1.5">
            CPT Code(s) <span className="text-cv-error">*</span>
          </label>
          <input
            id="cpt-codes"
            type="text"
            value={cptInput}
            onChange={(e) => setCptInput(e.target.value)}
            placeholder="e.g. 29881, 29880"
            className="w-full rounded-lg border border-cv-outline-variant/40 bg-cv-surface px-4 py-2.5 text-sm text-cv-on-surface placeholder:text-cv-on-surface-variant/50 focus:border-cv-primary focus:outline-none focus:ring-2 focus:ring-cv-primary/20"
          />
          <p className="mt-1 text-xs text-cv-on-surface-variant">Comma-separated 5-digit codes</p>
          {errors.cpt && <p className="mt-1 text-xs text-cv-error font-medium">{errors.cpt}</p>}
        </div>

        {/* Modifiers */}
        <div>
          <label htmlFor="modifiers" className="block text-sm font-semibold text-cv-on-surface mb-1.5">
            Modifier(s)
          </label>
          <input
            id="modifiers"
            type="text"
            value={modifierInput}
            onChange={(e) => setModifierInput(e.target.value)}
            placeholder="e.g. 59, RT, XS"
            className="w-full rounded-lg border border-cv-outline-variant/40 bg-cv-surface px-4 py-2.5 text-sm text-cv-on-surface placeholder:text-cv-on-surface-variant/50 focus:border-cv-primary focus:outline-none focus:ring-2 focus:ring-cv-primary/20"
          />
          <p className="mt-1 text-xs text-cv-on-surface-variant">Optional. Comma-separated (25, 59, LT, RT, XE, XS, XP, XU, etc.)</p>
          {errors.modifiers && <p className="mt-1 text-xs text-cv-error font-medium">{errors.modifiers}</p>}
        </div>

        {/* Date of Service */}
        <div>
          <label htmlFor="dos" className="block text-sm font-semibold text-cv-on-surface mb-1.5">
            Date of Service <span className="text-cv-error">*</span>
          </label>
          <input
            id="dos"
            type="date"
            value={dateOfService}
            onChange={(e) => setDateOfService(e.target.value)}
            max={todayString()}
            className="w-full rounded-lg border border-cv-outline-variant/40 bg-cv-surface px-4 py-2.5 text-sm text-cv-on-surface focus:border-cv-primary focus:outline-none focus:ring-2 focus:ring-cv-primary/20"
          />
          {errors.dos && <p className="mt-1 text-xs text-cv-error font-medium">{errors.dos}</p>}
        </div>

        {/* ICD-10 + Age row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="icd10" className="block text-sm font-semibold text-cv-on-surface mb-1.5">
              ICD-10 Diagnosis Code
            </label>
            <input
              id="icd10"
              type="text"
              value={icd10Code}
              onChange={(e) => setIcd10Code(e.target.value)}
              placeholder="e.g. M17.11"
              className="w-full rounded-lg border border-cv-outline-variant/40 bg-cv-surface px-4 py-2.5 text-sm text-cv-on-surface placeholder:text-cv-on-surface-variant/50 focus:border-cv-primary focus:outline-none focus:ring-2 focus:ring-cv-primary/20"
            />
            <p className="mt-1 text-xs text-cv-on-surface-variant">Optional</p>
            {errors.icd10 && <p className="mt-1 text-xs text-cv-error font-medium">{errors.icd10}</p>}
          </div>
          <div>
            <label htmlFor="age" className="block text-sm font-semibold text-cv-on-surface mb-1.5">
              Patient Age
            </label>
            <input
              id="age"
              type="number"
              min={0}
              max={120}
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              placeholder="e.g. 65"
              className="w-full rounded-lg border border-cv-outline-variant/40 bg-cv-surface px-4 py-2.5 text-sm text-cv-on-surface placeholder:text-cv-on-surface-variant/50 focus:border-cv-primary focus:outline-none focus:ring-2 focus:ring-cv-primary/20"
            />
            <p className="mt-1 text-xs text-cv-on-surface-variant">Optional. 0–120</p>
            {errors.age && <p className="mt-1 text-xs text-cv-error font-medium">{errors.age}</p>}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-medical-gradient text-cv-on-primary px-8 py-3 text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Validating..." : "Validate"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-3 text-sm font-semibold text-cv-on-surface-variant hover:bg-cv-surface-container-high rounded-lg transition-colors border border-cv-outline-variant/30"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
