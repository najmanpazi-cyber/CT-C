import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Modifier } from "@/types/coding";

interface ModifierBadgesProps {
  modifiers: Modifier[];
}

const ModifierBadges = ({ modifiers }: ModifierBadgesProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (modifiers.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">Modifiers</h3>
      <div className="flex flex-wrap gap-2">
        {modifiers.map((mod, i) => (
          <div key={i} className="flex flex-col">
            <Badge
              variant="outline"
              className="cursor-pointer border-warning/40 bg-warning/10 text-warning-foreground"
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
            >
              {mod.code} {mod.name}
            </Badge>
            {expandedIndex === i && (
              <p className="mt-1 text-xs text-muted-foreground">{mod.reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModifierBadges;
