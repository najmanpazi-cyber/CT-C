import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { ResultGatingState } from "@/hooks/useResultGatingState";

interface CleanClaimIndicatorProps {
  /** Canonical gating state from useResultGatingState */
  gatingState: ResultGatingState;
  /** Display label from the gating hook */
  label: string;
  /** Optional subtext (e.g., missing count, review-acknowledged note) */
  subtext?: string | null;
}

const stateConfig: Record<
  ResultGatingState,
  {
    containerClass: string;
    textClass: string;
    icon: typeof CheckCircle2;
    iconClass: string;
  }
> = {
  STATE_READY: {
    containerClass: "bg-confidence-high border border-confidence-high-border",
    textClass: "text-confidence-high-foreground",
    icon: CheckCircle2,
    iconClass: "text-success",
  },
  STATE_REVIEW_REQUIRED: {
    containerClass: "border border-[#D97706]/30 bg-[#D97706]/5",
    textClass: "text-[#92400E]",
    icon: AlertTriangle,
    iconClass: "text-[#D97706]",
  },
  STATE_BLOCKED: {
    containerClass: "bg-confidence-low border border-confidence-low-border",
    textClass: "text-confidence-low-foreground",
    icon: XCircle,
    iconClass: "text-destructive",
  },
};

const CleanClaimIndicator = ({
  gatingState,
  label,
  subtext,
}: CleanClaimIndicatorProps) => {
  const config = stateConfig[gatingState];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2.5 rounded-lg p-3 ${config.containerClass}`}>
      <Icon className={`h-5 w-5 shrink-0 ${config.iconClass}`} />
      <div>
        <span className={`text-sm font-semibold ${config.textClass}`}>
          {label}
        </span>
        {subtext && (
          <span className={`ml-2 text-xs ${config.textClass} opacity-80`}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};

export default CleanClaimIndicator;
