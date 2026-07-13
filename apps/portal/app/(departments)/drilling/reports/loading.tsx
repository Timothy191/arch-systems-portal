export default function DrillingReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-[var(--bg-tertiary)] animate-pulse"
          />
        ))}
      </div>
      <div className="h-16 rounded-2xl bg-[var(--bg-tertiary)] animate-pulse" />
      <div className="h-96 rounded-2xl bg-[var(--bg-tertiary)] animate-pulse" />
    </div>
  );
}
