"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@repo/ui/lib/utils";
import {
  Wifi,
  WifiOff,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  BatteryCharging,
  Volume2,
  Volume1,
  VolumeX,
  Bell,
  BellDot,
  SignalHigh,
  SignalMedium,
  SignalLow,
  CheckSquare,
  Database,
  HardDrive,
  Zap,
  AlertCircle,
  CheckCircle2,
  MinusCircle,
  Clock,
} from "lucide-react";

import {
  formatTimeSeconds,
  useNetworkStatus,
  useBatteryStatus,
  useAppVolume,
  useNotificationCount,
  useServerHealth,
} from "./hooks";
import type { HealthState } from "./hooks";

export function NetworkStatusRow({
  online,
  effectiveType,
  connType,
  downlink,
  rtt,
  supported,
}: ReturnType<typeof useNetworkStatus>) {
  const ConnQualityIcon = !online
    ? WifiOff
    : effectiveType === "4g" || effectiveType === "3g"
      ? SignalHigh
      : effectiveType === "2g"
        ? SignalMedium
        : effectiveType === "slow-2g"
          ? SignalLow
          : Wifi;

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
      <ConnQualityIcon
        className={cn(
          "w-4 h-4 shrink-0",
          online ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[var(--text-heading)]">
            {online ? "Connected" : "Offline"}
          </span>
          {effectiveType && (
            <span className="text-[10px] uppercase text-[var(--text-muted)]">
              {effectiveType}
            </span>
          )}
        </div>
        {supported && online && (
          <div className="flex items-center gap-2 mt-0.5">
            {connType && (
              <span className="text-[10px] text-[var(--text-muted)] capitalize">
                {connType}
              </span>
            )}
            {typeof downlink === "number" && (
              <span className="text-[10px] text-[var(--text-muted)]">
                {downlink.toFixed(1)} Mbps
              </span>
            )}
            {typeof rtt === "number" && (
              <span className="text-[10px] text-[var(--text-muted)]">
                {rtt} ms
              </span>
            )}
          </div>
        )}
        {!supported && (
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Network API unavailable
          </p>
        )}
      </div>
    </div>
  );
}

export function BatteryStatusRow({
  level,
  charging,
  chargingTime,
  dischargingTime,
  supported,
}: ReturnType<typeof useBatteryStatus>) {
  if (!supported || level === null) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
        <BatteryMedium className="w-4 h-4 text-[var(--text-secondary)]" />
        <span className="text-[12px] text-[var(--text-muted)]">
          Battery status unavailable
        </span>
      </div>
    );
  }

  const BatteryIcon = charging
    ? BatteryCharging
    : level <= 0.1
      ? BatteryWarning
      : level <= 0.3
        ? BatteryLow
        : level >= 0.8
          ? BatteryFull
          : BatteryMedium;

  const batteryColor = charging
    ? "text-[var(--accent-green)]"
    : level < 0.5
      ? "text-[var(--accent-red)]"
      : level < 0.7
        ? "text-[var(--accent-amber)]"
        : "text-[var(--accent-green)]";

  const barColor = charging
    ? "bg-[var(--accent-green)]"
    : level < 0.5
      ? "bg-[var(--accent-red)]"
      : level < 0.7
        ? "bg-[var(--accent-amber)]"
        : "bg-[var(--accent-green)]";

  return (
    <div className="px-2 py-1.5 rounded-md space-y-1.5">
      <div className="flex items-center gap-2.5">
        <BatteryIcon className={cn("w-4 h-4 shrink-0", batteryColor)} />
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[12px] font-medium text-[var(--text-heading)]">
            {Math.round(level * 100)}%
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {charging ? "Charging" : "On Battery"}
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor,
          )}
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>
      {charging && Number.isFinite(chargingTime) && chargingTime > 0 && (
        <p className="text-[10px] text-[var(--accent-green)]">
          {formatTimeSeconds(chargingTime)} to full
        </p>
      )}
      {!charging && Number.isFinite(dischargingTime) && dischargingTime > 0 && (
        <p className="text-[10px] text-[var(--text-muted)]">
          {formatTimeSeconds(dischargingTime)} remaining
        </p>
      )}
    </div>
  );
}

export function VolumeControlRow({
  volume,
  muted,
  toggleMute,
  adjust,
}: ReturnType<typeof useAppVolume>) {
  const VolumeIcon =
    muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const volumeColor =
    muted || volume === 0
      ? "text-[var(--text-muted)]"
      : "text-[var(--accent-blue)]";

  return (
    <div className="px-2 py-1.5 rounded-md space-y-1.5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="p-0.5 rounded hover:bg-black/[0.06] transition-colors"
        >
          <VolumeIcon className={cn("w-4 h-4", volumeColor)} />
        </button>
        <span className="text-[12px] font-medium text-[var(--text-heading)] min-w-[2rem]">
          {muted ? "Muted" : `${volume}%`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={muted ? 0 : volume}
        onChange={(e) => adjust(Number(e.target.value))}
        aria-label="Volume"
        className="w-full accent-[var(--accent-blue)] h-1"
      />
    </div>
  );
}

export function NotificationRow({
  count,
  clear,
}: ReturnType<typeof useNotificationCount>) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
      <div className="relative">
        {count > 0 ? (
          <BellDot className="w-4 h-4 text-[var(--text-secondary)]" />
        ) : (
          <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
        )}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-[14px] px-[3px] rounded-full bg-[var(--accent-red)] text-white text-[9px] font-bold leading-none">
            {count}
          </span>
        )}
      </div>
      <span className="text-[12px] text-[var(--text-heading)] flex-1">
        {count > 0
          ? `${count} notification${count === 1 ? "" : "s"}`
          : "No notifications"}
      </span>
      {count > 0 && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear notifications"
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
//  ServerHealthRow
/* ------------------------------------------------------------------ */
function HealthSubRow({
  label,
  status,
  icon: Icon,
}: {
  label: string;
  status: "ok" | "unavailable" | "disabled";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const config = {
    ok: { color: "text-[var(--accent-green)]", label: "OK" },
    unavailable: { color: "text-[var(--accent-red)]", label: "Unavailable" },
    disabled: { color: "text-[var(--text-muted)]", label: "Disabled" },
  };
  const c = config[status] ?? config.ok;

  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("w-3 h-3 shrink-0", c.color)} />
      <span className="text-[11px] text-[var(--text-secondary)] flex-1">
        {label}
      </span>
      <span className={cn("text-[10px] font-medium", c.color)}>{c.label}</span>
    </div>
  );
}

export function ServerHealthRow({
  status,
  db,
  redis,
  aiRouter,
  responseTime,
  loading,
}: Omit<HealthState, "timestamp" | "pooler" | "lastFetched">) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      color: "text-[var(--accent-green)]",
      label: "Healthy",
    },
    degraded: {
      icon: MinusCircle,
      color: "text-[var(--accent-blue)]",
      label: "Degraded",
    },
    error: {
      icon: AlertCircle,
      color: "text-[var(--accent-red)]",
      label: "Error",
    },
  };

  const current = statusConfig[status] ?? statusConfig.healthy;

  return (
    <div className="px-2 py-1.5 rounded-md space-y-1.5">
      <div className="flex items-center gap-2.5">
        <current.icon className={cn("w-4 h-4 shrink-0", current.color)} />
        <span className="text-[12px] font-medium text-[var(--text-heading)] flex-1">
          Server Health
        </span>
        <span className={cn("text-[10px] font-medium", current.color)}>
          {current.label}
        </span>
      </div>

      <div className="space-y-1">
        <HealthSubRow label="Database" status={db} icon={Database} />
        <HealthSubRow label="Redis" status={redis} icon={HardDrive} />
        <HealthSubRow label="AI Router" status={aiRouter} icon={Zap} />
      </div>

      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        <Clock className="w-3 h-3" />
        <span className="text-[10px]">
          {loading
            ? "Checking…"
            : responseTime > 0
              ? `${responseTime}ms`
              : "Unavailable"}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────── SystemTrayPill ─────────────────────────── */
