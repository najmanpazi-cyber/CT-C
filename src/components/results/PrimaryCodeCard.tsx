import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { PrimaryCode } from "@/types/coding";

interface PrimaryCodeCardProps {
  code: PrimaryCode;
  feedbackType: "positive" | "negative" | null;
  onFeedback: (type: "positive" | "negative") => void;
}

const confidenceStyles = {
  high: "bg-success text-success-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-destructive text-destructive-foreground",
};

const PrimaryCodeCard = ({ code, feedbackType, onFeedback }: PrimaryCodeCardProps) => (
  <div className="rounded-lg border p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="font-mono-code text-2xl font-bold text-foreground">{code.cpt_code}</p>
        <p className="mt-1 text-sm text-muted-foreground">{code.description}</p>
        <div className="mt-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              confidenceStyles[code.confidence]
            }`}
          >
            {code.confidence.charAt(0).toUpperCase() + code.confidence.slice(1)} Confidence
          </span>
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onFeedback("positive")}
          className={`rounded p-1.5 transition-colors hover:bg-muted ${
            feedbackType === "positive" ? "text-success" : "text-muted-foreground"
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => onFeedback("negative")}
          className={`rounded p-1.5 transition-colors hover:bg-muted ${
            feedbackType === "negative" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

export default PrimaryCodeCard;
