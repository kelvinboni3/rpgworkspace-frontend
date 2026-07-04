export function DossierEvaluationGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-border/60 bg-background/40 border px-2 py-2 text-center"
        >
          <div className="font-display text-primary text-sm">{item.value}</div>
          <div className="dossier-meta text-[10px] tracking-widest">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
