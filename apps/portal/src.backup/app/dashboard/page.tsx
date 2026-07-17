import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Arch Systems",
};

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gray-950 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          Welcome to Arch Systems — your mining-operations portal.
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Sites", value: "—", color: "sky" },
          { label: "Fleet Units", value: "—", color: "emerald" },
          { label: "Alerts", value: "—", color: "amber" },
          { label: "System Health", value: "—", color: "violet" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-800 bg-gray-900 p-6"
          >
            <p className="text-sm text-gray-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <p className="text-sm text-gray-400">
          Connect your data sources and configure widgets to populate this
          dashboard.
        </p>
      </div>
    </main>
  );
}
