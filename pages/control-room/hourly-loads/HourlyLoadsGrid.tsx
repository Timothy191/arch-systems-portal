"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { GlassCard } from "@repo/ui/GlassCard";
import { Button } from "@repo/ui/Button";
import { Download, Upload } from "lucide-react";
import { useHourlyLoads } from "./useHourlyLoads";
import { getHourlyLoadsColumns } from "./HourlyLoadsColumns";

const DataGrid = dynamic(
  () => import("@repo/ui/DataGrid").then((m) => m.DataGrid),
  { ssr: false },
);

export interface Machine {
  id: string;
  name: string;
  machine_type: string;
  bin_factor?: number | null;
  site_id?: string | null;
  sites?: { name: string }[] | { name: string } | null;
}

export interface HourlyLoad {
  id: string;
  machine_id: string;
  shift_type: "day" | "night";
  hour_01: number;
  hour_02: number;
  hour_03: number;
  hour_04: number;
  hour_05: number;
  hour_06: number;
  hour_07: number;
  hour_08: number;
  hour_09: number;
  hour_10: number;
  hour_11: number;
  hour_12: number;
  total_loads: number;
  material_type?: "Waste" | "Coal";
}

interface HourlyLoadsGridProps {
  departmentId: string;
  machines: Machine[];
  hourlyLoads: HourlyLoad[];
  sites: { id: string; name: string; site_code: string }[];
}

export function HourlyLoadsGrid({
  departmentId,
  machines,
  hourlyLoads,
  sites,
}: HourlyLoadsGridProps) {
  const {
    selectedShift,
    setSelectedShift,
    saving,
    containerRef,
    containerWidth,
    source,
    handleGridClick,
    handleGridChange,
    handleAfterEdit,
    handleExport,
    handleImport,
    hourLabels,
    hasBinFactors,
  } = useHourlyLoads({ departmentId, machines, hourlyLoads });

  // Columns built dynamically using external columns config
  const columns = useMemo(() => {
    return getHourlyLoadsColumns({
      containerWidth,
      hasBinFactors,
      machines,
      sites,
      hourLabels,
    });
  }, [containerWidth, hasBinFactors, machines, sites, hourLabels]);

  if (machines.length === 0) {
    return (
      <GlassCard>
        <p className="text-[var(--text-muted)] text-sm text-center py-8">
          No machines available. Add machines in the Machine DB tab first.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Shift Selector & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-[var(--text-muted)] text-sm">Shift:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedShift("day")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedShift === "day"
                  ? "bg-[var(--accent-blue)] text-[var(--bg-secondary)]"
                  : "bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-heading)]"
              }`}
            >
              Day (06:00 - 17:59)
            </button>
            <button
              type="button"
              onClick={() => setSelectedShift("night")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedShift === "night"
                  ? "bg-[var(--accent-blue)] text-[var(--bg-secondary)]"
                  : "bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-heading)]"
              }`}
            >
              Night (18:00 - 05:59)
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="file"
            id="excel-import"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={handleImport}
            aria-label="Import Excel file with hourly load data"
          />
          <Button
            size="sm"
            variant="secondary"
            shape="rounded-lg"
            onClick={() => document.getElementById("excel-import")?.click()}
            disabled={saving}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            size="sm"
            variant="secondary"
            shape="rounded-lg"
            onClick={handleExport}
            disabled={saving}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        onClick={handleGridClick}
        onChange={handleGridChange}
        className="revo-grid-visible"
      >
        <DataGrid
          key={`grid-${containerWidth}-${columns.length}`}
          columns={columns}
          source={source}
          height="500px"
          resize={false}
          filter={false}
          sorting={false}
          onAfterEdit={handleAfterEdit}
          stretch="all"
        />
      </div>
    </div>
  );
}
