import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

const PRODUCT_NAME = "[PRODUCT NAME]";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
      {/* Left: back link + name */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Home</span>
        </button>

        <div className="h-4 w-px shrink-0 bg-border" />

        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-xl">
            {PRODUCT_NAME}
          </h1>
          <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
            Orthopedic Coding Assistant
          </span>
        </div>
      </div>

      {/* Right: Beta badge */}
      <Badge variant="secondary" className="ml-2 shrink-0 text-xs font-medium">
        Beta
      </Badge>
    </header>
  );
};

export default Header;
