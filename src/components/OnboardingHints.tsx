import { useState, useEffect } from "react";

const STORAGE_KEY = "claimvex_onboarding_complete";

const HINTS = [
  {
    target: "cpt-codes",
    text: "Enter the CPT codes from the claim you want to validate. Comma-separate multiple codes.",
    position: "below" as const,
  },
  {
    target: "validate-btn",
    text: "Click Validate to run all 5 rule modules. You'll see pass/fail results for each check.",
    position: "below" as const,
  },
  {
    target: "history-link",
    text: "Every validation is saved here. Track your error rate and ROI over time.",
    position: "below" as const,
  },
];

export function useOnboarding() {
  const [step, setStep] = useState(-1);
  const [complete, setComplete] = useState(true);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setComplete(false);
      setStep(0);
    }
  }, []);

  function advance() {
    if (step < HINTS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
      setComplete(true);
      setStep(-1);
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setComplete(true);
    setStep(-1);
  }

  return { step, complete, advance, dismiss, hint: step >= 0 ? HINTS[step] : null };
}

interface OnboardingTooltipProps {
  targetId: string;
  text: string;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onDismiss: () => void;
}

export function OnboardingTooltip({ targetId, text, stepNumber, totalSteps, onNext, onDismiss }: OnboardingTooltipProps) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX, width: rect.width });
    }
  }, [targetId]);

  if (!pos) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[998]" onClick={onDismiss} />
      <div
        className="absolute z-[999] w-72 rounded-xl bg-cv-primary text-cv-on-primary p-4 shadow-2xl"
        style={{ top: pos.top, left: Math.max(16, pos.left) }}
      >
        <p className="text-sm leading-relaxed mb-3">{text}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs opacity-70">{stepNumber + 1} of {totalSteps}</span>
          <div className="flex gap-2">
            <button onClick={onDismiss} className="text-xs opacity-70 hover:opacity-100 transition-opacity">Skip</button>
            <button onClick={onNext} className="text-xs font-bold bg-cv-on-primary/20 hover:bg-cv-on-primary/30 px-3 py-1 rounded transition-colors">
              {stepNumber === totalSteps - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
