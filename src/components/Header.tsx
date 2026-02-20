import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

const PRODUCT_NAME = "[PRODUCT NAME]";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{PRODUCT_NAME}</h1>
          <span className="text-sm text-muted-foreground">Orthopedic Coding Assistant</span>
        </div>
        <Badge variant="secondary" className="text-xs font-medium">Beta</Badge>
      </div>
    </header>
  );
};

export default Header;
