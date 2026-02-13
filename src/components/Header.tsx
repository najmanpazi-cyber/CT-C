import { Badge } from "@/components/ui/badge";

const Header = () => {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Vibecoded</h1>
        <span className="text-sm text-muted-foreground">Orthopedic Coding Assistant</span>
      </div>
      <Badge variant="secondary" className="text-xs font-medium">Beta</Badge>
    </header>
  );
};

export default Header;
