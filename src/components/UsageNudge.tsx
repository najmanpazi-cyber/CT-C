import { useState } from "react";

interface UsageNudgeProps {
  validationCount: number;
  lastActiveDate: string | null;
}

export default function UsageNudge({ validationCount, lastActiveDate }: UsageNudgeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Milestone celebration
  const milestones = [10, 25, 50, 100, 250, 500];
  const milestone = milestones.find((m) => validationCount === m);
  if (milestone) {
    return (
      <div className="rounded-xl border border-cv-secondary/30 bg-cv-secondary/5 p-4 flex items-center gap-4 mb-6">
        <span className="material-symbols-outlined text-cv-secondary text-2xl">celebration</span>
        <div className="flex-1">
          <span className="text-sm font-bold text-cv-on-surface">{milestone} validations!</span>
          <span className="text-sm text-cv-on-surface-variant ml-2">
            You&apos;ve caught potential errors across {milestone} claims. Keep going.
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-cv-on-surface-variant/40 hover:text-cv-on-surface-variant">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    );
  }

  // Inactivity nudge — show if last active > 3 days ago and has some history
  if (lastActiveDate && validationCount > 0) {
    const daysSince = Math.floor((Date.now() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 3) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-4 mb-6">
          <span className="material-symbols-outlined text-amber-600 text-2xl">notifications_active</span>
          <div className="flex-1">
            <span className="text-sm font-bold text-amber-800">Haven&apos;t validated in {daysSince} days.</span>
            <span className="text-sm text-amber-700 ml-2">
              Paste a claim below to keep your error rate tracking current.
            </span>
          </div>
          <button onClick={() => setDismissed(true)} className="text-amber-300 hover:text-amber-500">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      );
    }
  }

  return null;
}
