interface RationaleCardProps {
  rationale: string;
}

const RationaleCard = ({ rationale }: RationaleCardProps) => (
  <div>
    <h3 className="mb-2 text-sm font-semibold text-foreground">Coding Rationale</h3>
    <div className="rounded-lg border border-info-border bg-info p-4">
      <p className="text-sm leading-relaxed text-foreground">{rationale}</p>
    </div>
  </div>
);

export default RationaleCard;
