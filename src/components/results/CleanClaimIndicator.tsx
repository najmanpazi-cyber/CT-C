import { CheckCircle2, XCircle } from "lucide-react";

interface CleanClaimIndicatorProps {
  ready: boolean;
  missingCount?: number;
}

const CleanClaimIndicator = ({ ready, missingCount = 0 }: CleanClaimIndicatorProps) => (
  <div
    className={`flex items-center gap-2.5 rounded-lg p-3 ${
      ready
        ? "bg-confidence-high border border-confidence-high-border"
        : "bg-confidence-low border border-confidence-low-border"
    }`}
  >
    {ready
      ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
      : <XCircle className="h-5 w-5 shrink-0 text-destructive" />
    }
    <div>
      <span className={`text-sm font-semibold ${ready ? "text-confidence-high-foreground" : "text-confidence-low-foreground"}`}>
        {ready ? "Clean Claim Ready" : "Review Required"}
      </span>
      {!ready && missingCount > 0 && (
        <span className="ml-2 text-xs text-destructive">
          {missingCount} documentation gap{missingCount > 1 ? "s" : ""} — see below
        </span>
      )}
    </div>
  </div>
);

export default CleanClaimIndicator;
