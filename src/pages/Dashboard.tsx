import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ValidationForm from "@/components/ValidationForm";
import ValidationResults from "@/components/ValidationResults";
import SampleDataPanel from "@/components/SampleDataPanel";
import TrialBanner from "@/components/TrialBanner";
import TrialExpiredGate from "@/components/TrialExpiredGate";
import TrialBadge from "@/components/TrialBadge";
import type { ValidationFormData } from "@/components/ValidationForm";
import { runValidation } from "@/services/validationService";
import { saveValidation, fetchValidations } from "@/services/historyService";
import { fetchTrialStatus } from "@/services/trialService";
import { SAMPLE_SCENARIOS } from "@/data/sampleScenarios";
import type { ValidationResult } from "@/services/validationService";
import type { TrialStatus } from "@/services/trialService";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [hasHistory, setHasHistory] = useState<boolean | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchTrialStatus(user.id).then(setTrial);
    fetchValidations(user.id).then(({ data }) => setHasHistory(data.length > 0));
  }, [user]);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function handleValidate(data: ValidationFormData) {
    const validationResult = runValidation(data);
    setResult(validationResult);

    if (user) {
      setSaving(true);
      await saveValidation(user.id, data, validationResult);
      setSaving(false);
      setHasHistory(true);
    }
  }

  async function handleRunAll() {
    if (!user) return;
    setRunningAll(true);

    for (const scenario of SAMPLE_SCENARIOS) {
      const validationResult = runValidation(scenario.data);
      await saveValidation(user.id, scenario.data, validationResult);
    }

    setRunningAll(false);
    setHasHistory(true);
    navigate("/history");
  }

  function handleValidateAnother() {
    setResult(null);
  }

  const canValidate = trial && !trial.isExpired;
  const showSampleData = hasHistory === false && !result && canValidate;

  return (
    <div className="min-h-screen bg-cv-surface">
      {trial?.showBanner && <TrialBanner daysRemaining={trial.daysRemaining} />}

      <nav className="border-b border-cv-outline-variant/30 bg-cv-surface-container-lowest">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8 py-4">
          <Link to="/dashboard" className="text-2xl font-extrabold tracking-tight text-cv-primary font-headline">
            ClaimVex
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 text-sm font-semibold">
              <Link to="/dashboard" className="text-cv-primary border-b-2 border-cv-secondary pb-0.5">Validate</Link>
              <Link to="/history" className="text-cv-on-surface-variant hover:text-cv-primary transition-colors">History</Link>
            </div>
            {trial && <TrialBadge status={trial} />}
            <span className="text-sm text-cv-on-surface-variant font-medium hidden md:inline">{user?.email}</span>
            <button onClick={handleSignOut} className="px-4 py-2 text-sm font-semibold text-cv-error hover:bg-cv-error-container/20 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-extrabold text-cv-primary">
            {result ? "Validation Results" : "Validate a Claim"}
          </h1>
          <p className="mt-2 text-cv-on-surface-variant">
            {result
              ? "Review the results below. Click on any module to see details."
              : canValidate
                ? "Enter claim data below to check against all validation modules."
                : ""}
          </p>
        </div>

        {!canValidate && trial ? (
          <TrialExpiredGate />
        ) : result ? (
          <>
            {saving && <div className="mb-4 text-xs text-cv-on-surface-variant">Saving to history...</div>}
            <ValidationResults result={result} onValidateAnother={handleValidateAnother} />
          </>
        ) : (
          <div className="space-y-8">
            <ValidationForm onSubmit={handleValidate} />
            {showSampleData && (
              <SampleDataPanel
                onRunScenario={handleValidate}
                onRunAll={handleRunAll}
                loading={runningAll}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
