export default function ExecutiveLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
          <div className="h-8 w-20 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-[var(--bg-tertiary)] animate-pulse"
          />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
    </div>
  );
}
