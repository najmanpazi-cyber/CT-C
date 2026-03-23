import { SAMPLE_SCENARIOS } from "@/data/sampleScenarios";
import type { SampleScenario } from "@/data/sampleScenarios";
import type { ValidationFormData } from "@/components/ValidationForm";

interface SampleDataPanelProps {
  onRunScenario: (data: ValidationFormData) => void;
  onRunAll: () => void;
  loading?: boolean;
}

function ScenarioCard({ scenario, onRun }: { scenario: SampleScenario; onRun: () => void }) {
  return (
    <button
      onClick={onRun}
      className="text-left p-4 rounded-xl border border-cv-outline-variant/20 bg-cv-surface hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined text-xl mt-0.5 ${
          scenario.expectedOutcome === "clean" ? "text-green-600" : "text-red-500"
        }`}>{scenario.icon}</span>
        <div>
          <div className="text-sm font-bold text-cv-on-surface group-hover:text-cv-primary transition-colors">
            {scenario.label}
          </div>
          <div className="text-xs text-cv-on-surface-variant mt-1 leading-relaxed">
            {scenario.description}
          </div>
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cv-on-surface-variant bg-cv-surface-container-high px-2 py-0.5 rounded">
              {scenario.data.cptCodes.join(", ")}
            </span>
            {scenario.data.payerType !== "commercial" && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-cv-primary bg-cv-primary/5 px-2 py-0.5 rounded">
                {scenario.data.payerType}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function SampleDataPanel({ onRunScenario, onRunAll, loading }: SampleDataPanelProps) {
  return (
    <div className="rounded-2xl border border-dashed border-cv-secondary/30 bg-cv-secondary/5 p-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="material-symbols-outlined text-cv-secondary text-xl">science</span>
        <h3 className="text-base font-bold text-cv-on-surface">Try with Sample Data</h3>
      </div>
      <p className="text-sm text-cv-on-surface-variant mb-6">
        See ClaimVex in action with realistic orthopedic scenarios. Click any scenario to run it, or run all 4 at once.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {SAMPLE_SCENARIOS.map((s) => (
          <ScenarioCard key={s.label} scenario={s} onRun={() => onRunScenario(s.data)} />
        ))}
      </div>

      <button
        onClick={onRunAll}
        disabled={loading}
        className="w-full bg-medical-gradient text-cv-on-primary py-3 text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:brightness-110 transition-all disabled:opacity-50"
      >
        {loading ? "Running all scenarios..." : "Run All 4 Scenarios"}
      </button>
    </div>
  );
}
