import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Clock, TrendingUp, Tag } from "lucide-react";
import { lookupCpt, lookupModifier } from "@/data/cptReference";

// ─── CPT Code Tooltip ────────────────────────────────────────────────────────

interface CptTooltipProps {
  code: string;
  children: React.ReactNode;
}

const globalLabel = (days: 0 | 10 | 90 | null) => {
  if (days === null) return null;
  if (days === 0)  return { text: "0-day global", cls: "text-confidence-high-foreground" };
  if (days === 10) return { text: "10-day global", cls: "text-confidence-medium-foreground" };
  if (days === 90) return { text: "90-day global", cls: "text-confidence-low-foreground" };
  return { text: `${days}-day global`, cls: "text-muted-foreground" };
};

export const CptTooltip = ({ code, children }: CptTooltipProps) => {
  const info = lookupCpt(code);
  if (!info) return <>{children}</>;

  const global = globalLabel(info.globalDays);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted decoration-primary/40 underline-offset-2">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs rounded-lg border border-border bg-card p-3 shadow-lg text-left"
          sideOffset={6}
        >
          {/* Code + Category */}
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-foreground">{code.replace(/^\+/, "")}</span>
            <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              <Tag className="h-2.5 w-2.5" />
              {info.category}
            </span>
          </div>

          {/* Descriptor */}
          <p className="text-xs leading-snug text-foreground/80">{info.descriptor}</p>

          {/* Badges row */}
          <div className="mt-2 flex flex-wrap gap-2">
            {info.rvu != null && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-foreground/80">
                <TrendingUp className="h-3 w-3 text-primary" />
                {info.rvu} wRVU
              </span>
            )}
            {global && (
              <span className={`flex items-center gap-1 text-[11px] font-medium ${global.cls}`}>
                <Clock className="h-3 w-3" />
                {global.text}
              </span>
            )}
            {info.globalDays === null && info.category !== "Spine Add-on" && info.category !== "Pain Management Add-on" && info.category !== "Knee Add-on" && info.category !== "Arthroscopy Add-on" && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                No global period
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ─── Modifier Tooltip ────────────────────────────────────────────────────────

interface ModifierTooltipProps {
  code: string;
  children: React.ReactNode;
}

export const ModifierTooltip = ({ code, children }: ModifierTooltipProps) => {
  const info = lookupModifier(code);
  if (!info) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted decoration-primary/40 underline-offset-2">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs rounded-lg border border-border bg-card p-3 shadow-lg text-left"
          sideOffset={6}
        >
          {/* Modifier code + name */}
          <div className="mb-1.5">
            <span className="font-mono text-xs font-bold text-foreground">
              -{code.replace(/^[-]/, "").toUpperCase()}
            </span>
            <span className="ml-1.5 text-xs font-semibold text-foreground/80">{info.name}</span>
          </div>

          {/* Definition */}
          <p className="text-xs leading-snug text-foreground/80">{info.definition}</p>

          {/* Common use */}
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            <span className="font-medium text-foreground/80">Common use: </span>
            {info.commonUse}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
