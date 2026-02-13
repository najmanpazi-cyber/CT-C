import { CheckCircle2, XCircle } from "lucide-react";

interface CleanClaimIndicatorProps {
  ready: boolean;
}

const CleanClaimIndicator = ({ ready }: CleanClaimIndicatorProps) => (
  <div
    className={`flex items-center gap-2 rounded-lg p-3 ${
      ready ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
    }`}
  >
    {ready ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
    <span className="text-sm font-semibold">
      {ready ? "Clean Claim Ready" : "Review Required"}
    </span>
  </div>
);

export default CleanClaimIndicator;
