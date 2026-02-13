import type { ICD10Code } from "@/types/coding";

interface DiagnosisCodesProps {
  codes: ICD10Code[];
}

const DiagnosisCodes = ({ codes }: DiagnosisCodesProps) => {
  if (codes.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">Diagnosis Codes (ICD-10)</h3>
      <div className="flex flex-col gap-2">
        {codes.map((code, i) => (
          <div key={i} className="rounded-lg border p-3">
            <p className="text-sm font-medium">
              <span className="font-mono-code font-semibold">{code.code}</span>
              <span className="ml-2 text-muted-foreground">{code.description}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Medical Necessity:</span> {code.necessity}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiagnosisCodes;
