import { ThumbsUp, ThumbsDown, Clock, TrendingUp } from "lucide-react";
import type { PrimaryCode } from "@/types/coding";
import { CptTooltip } from "@/components/CptTooltip";

interface PrimaryCodeCardProps {
  code: PrimaryCode;
  feedbackType: "positive" | "negative" | null;
  onFeedback: (type: "positive" | "negative") => void;
}

const confidenceConfig = {
  high:   { className: "bg-confidence-high text-confidence-high-foreground border-confidence-high-border", label: "High Confidence" },
  medium: { className: "bg-confidence-medium text-confidence-medium-foreground border-confidence-medium-border", label: "Medium Confidence" },
  low:    { className: "bg-confidence-low text-confidence-low-foreground border-confidence-low-border", label: "Low Confidence" },
};

const globalPeriodLabel = (days: number | null | undefined) => {
  if (days === null || days === undefined) return null;
  if (days === 0)  return { label: "0-day global",  cls: "bg-confidence-high text-confidence-high-foreground border-confidence-high-border" };
  if (days === 10) return { label: "10-day global", cls: "bg-confidence-medium text-confidence-medium-foreground border-confidence-medium-border" };
  if (days === 90) return { label: "90-day global", cls: "bg-confidence-low text-confidence-low-foreground border-confidence-low-border" };
  return { label: `${days}-day global`, cls: "bg-muted text-muted-foreground border-border" };
};

const PrimaryCodeCard = ({ code, feedbackType, onFeedback }: PrimaryCodeCardProps) => {
  const conf = confidenceConfig[code.confidence];
  const globalInfo = globalPeriodLabel(code.global_period_days);

  return (
    <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-card to-primary/[0.03] p-5 shadow-md ring-1 ring-primary/10">
      {/* Top row: code + feedback buttons */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-3xl font-bold tracking-tight text-foreground">
            <CptTooltip code={code.cpt_code}>{code.cpt_code}</CptTooltip>
          </p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{code.description}</p>
        </div>
        <div className="flex shrink-0 gap-1 pt-0.5">
          <button
            onClick={() => onFeedback("positive")}
            title="This code looks correct"
            className={`rounded-md p-1.5 transition-colors hover:bg-confidence-high ${
              feedbackType === "positive" ? "text-success" : "text-muted-foreground/40"
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onFeedback("negative")}
            title="This code needs correction"
            className={`rounded-md p-1.5 transition-colors hover:bg-confidence-low ${
              feedbackType === "negative" ? "text-destructive" : "text-muted-foreground/40"
            }`}
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Badges row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Confidence */}
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${conf.className}`}>
          {conf.label}
        </span>

        {/* Global period */}
        {globalInfo && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${globalInfo.cls}`}>
            <Clock className="h-3 w-3" />
            {globalInfo.label}
          </span>
        )}

        {/* RVU */}
        {code.rvu != null && code.rvu > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/80">
            <TrendingUp className="h-3 w-3 text-primary" />
            {code.rvu} wRVU
          </span>
        )}
      </div>
    </div>
  );
};

export default PrimaryCodeCard;
