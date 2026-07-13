export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--bg-primary)]/80 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3">
          <span className="text-lg font-medium text-[var(--text-heading)]">
            Admin Dashboard
          </span>
        </div>
      </header>
      <main className="p-6 max-w-7xl mx-auto">
        <div className="space-y-4">
          <div className="h-10 w-64 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
          <div className="h-96 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
        </div>
      </main>
    </div>
  );
}
