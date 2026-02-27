import type { AddOnCode } from "@/types/coding";
import { Plus } from "lucide-react";
import { CptTooltip } from "@/components/CptTooltip";

interface AddOnCodesProps {
  codes: AddOnCode[];
}

const AddOnCodes = ({ codes }: AddOnCodesProps) => {
  if (!codes || codes.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-addon-foreground text-white">
          <Plus className="h-2.5 w-2.5" />
        </span>
        Add-On Codes
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          — must bill with primary code
        </span>
      </h3>
      <div className="flex flex-col gap-2">
        {codes.map((code, i) => (
          <div key={i} className="rounded-lg border border-addon-border bg-addon p-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-addon-foreground">
                <CptTooltip code={code.cpt_code}>{code.cpt_code}</CptTooltip>
              </span>
              <span className="text-sm text-foreground">{code.description}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{code.reason}</p>
            <p className="mt-1 text-xs text-addon-foreground font-medium">
              Required primary: {code.requires_primary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddOnCodes;
