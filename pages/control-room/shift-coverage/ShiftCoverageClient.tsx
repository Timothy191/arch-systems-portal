"use client";

import { useState, useTransition } from "react";
import { GlassCard } from "@repo/ui/GlassCard";
import { ShiftToggle } from "@repo/ui/ShiftToggle";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { CloseShiftModal } from "~/features/departments/components/control-room/CloseShiftModal";
import { getShiftCoverage } from "./actions";
import type { ShiftCoverageData } from "./actions";

interface ShiftCoverageClientProps {
  departmentId: string;
  departmentSlug: string;
  initialDate: string;
  initialShift: "day" | "night";
  initialData?: ShiftCoverageData;
}

interface MachineWithOp {
  id: string;
  name: string;
  machine_type: string;
  hours_worked: number | null;
  has_entry: boolean;
}

interface ShiftHistoryItem {
  id: string;
  shift_date: string;
  shift_type: "day" | "night";
  closed_at: string;
}

export function ShiftCoverageClient({
  departmentId,
  departmentSlug,
  initialDate,
  initialShift,
  initialData,
}: ShiftCoverageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);
  const [shiftType, setShiftType] = useState<"day" | "night">(initialShift);
  const [machines, setMachines] = useState<MachineWithOp[]>(
    initialData?.machines ?? [],
  );
  const [isClosed, setIsClosed] = useState(initialData?.isClosed ?? false);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ShiftHistoryItem[]>(
    initialData?.history ?? [],
  );
  const [showModal, setShowModal] = useState(false);

  // Refetch coverage server-side when the user changes date/shift. No Supabase
  // client or DB schema is shipped to the browser — the data comes from the
  // `getShiftCoverage` Server Action.
  const refetch = (nextDate: string, nextShift: "day" | "night") => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const result = await getShiftCoverage(departmentId, nextDate, nextShift);
      if (result.error || !result.data) {
        setError(result.error ?? "Failed to load shift data");
        setLoading(false);
        return;
      }
      setMachines(result.data.machines);
      setIsClosed(result.data.isClosed);
      setHistory(result.data.history);
      setLoading(false);
    });
  };

  const changeDate = (nextDate: string) => {
    setDate(nextDate);
    refetch(nextDate, shiftType);
  };

  const changeShift = (nextShift: "day" | "night") => {
    setShiftType(nextShift);
    refetch(date, nextShift);
  };

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    changeDate(d.toISOString().split("T")[0] || "");
  };

  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    changeDate(d.toISOString().split("T")[0] || "");
  };

  const reportedCount = machines.filter((m) => m.has_entry).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-heading)]">
          Shift Coverage
        </h2>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={prevDay}
              disabled={isPending}
              aria-label="Previous day"
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[var(--text-heading)] font-medium text-sm">
              {new Date(date).toLocaleDateString("en-ZA", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <button
              type="button"
              onClick={nextDay}
              disabled={isPending}
              aria-label="Next day"
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="w-48">
            <ShiftToggle value={shiftType} onChange={changeShift} />
          </div>
        </div>
      </GlassCard>

      {error && (
        <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
          <p className="text-accent-red text-sm">{error}</p>
        </div>
      )}

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-[var(--text-heading)]">
              Machine Coverage
            </h3>
            {isClosed && (
              <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border bg-accent-green/10 border-accent-green/20 text-accent-green">
                <span className="badge-pulse-dot bg-accent-green" />
                Closed
              </span>
            )}
          </div>
          <p className="text-[var(--text-muted)] text-sm">
            {loading
              ? "Loading..."
              : `${reportedCount} / ${machines.length} reported`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 bg-[var(--bg-tertiary)] rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : machines.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm py-8 text-center">
            No machines registered
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-tertiary)]">
                  <th
                    scope="col"
                    className="text-left px-4 py-2.5 text-[var(--text-muted)] text-xs font-medium"
                  >
                    Machine
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-2.5 text-[var(--text-muted)] text-xs font-medium"
                  >
                    Hours
                  </th>
                  <th
                    scope="col"
                    className="text-center px-4 py-2.5 text-[var(--text-muted)] text-xs font-medium"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {machines.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-[var(--text-heading)]">
                      <span className="text-[var(--text-muted)] text-xs mr-2 uppercase">
                        {m.machine_type}
                      </span>
                      {m.name}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-heading)] font-medium tabular-nums">
                      {m.hours_worked !== null
                        ? `${Number(m.hours_worked).toFixed(1)}h`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {m.has_entry &&
                      m.hours_worked !== null &&
                      m.hours_worked > 0 ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-accent-green" />
                          <span className="text-accent-green text-xs">
                            Reported
                          </span>
                        </div>
                      ) : m.has_entry && m.hours_worked === 0 ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-accent-blue" />
                          <span className="text-accent-blue text-xs">
                            Partial
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <XCircle className="w-4 h-4 text-accent-red" />
                          <span className="text-accent-red text-xs">
                            Missing
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !isClosed && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/90 text-[var(--bg-secondary)] font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            <Clock className="w-4 h-4" />
            Close Shift
          </button>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-bold text-[var(--text-heading)] mb-4">
          Close-out History
        </h3>

        {history.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm py-4 text-center">
            No previous close-outs
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-tertiary)]">
                  <th
                    scope="col"
                    className="text-left px-4 py-2.5 text-[var(--text-muted)] text-xs font-medium"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-2.5 text-[var(--text-muted)] text-xs font-medium"
                  >
                    Shift
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-2.5 text-[var(--text-muted)] text-xs font-medium"
                  >
                    Closed At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-[var(--text-heading)]">
                      {new Date(item.shift_date).toLocaleDateString("en-ZA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.shift_type === "day"
                            ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
                            : "bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
                        }`}
                      >
                        {item.shift_type === "day" ? "Day" : "Night"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs">
                      {new Date(item.closed_at).toLocaleString("en-ZA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <CloseShiftModal
        open={showModal}
        onClose={() => setShowModal(false)}
        departmentId={departmentId}
        departmentSlug={departmentSlug}
        date={date}
        shiftType={shiftType}
        onComplete={() => {
          setShowModal(false);
          // G3: targeted RSC refresh instead of a full page reload.
          router.refresh();
        }}
      />
    </div>
  );
}
