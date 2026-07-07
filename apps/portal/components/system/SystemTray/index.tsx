"use client";

import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
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
  CheckSquare,
} from "lucide-react";

import {
  useNetworkStatus,
  useBatteryStatus,
  useAppVolume,
  useNotificationCount,
  useServerHealth,
} from "./hooks";
import {
  NetworkStatusRow,
  BatteryStatusRow,
  VolumeControlRow,
  NotificationRow,
  ServerHealthRow,
} from "./components";
export * from "./hooks";
export * from "./components";
export function SystemTrayPill() {
  const network = useNetworkStatus();
  const battery = useBatteryStatus();
  const volume = useAppVolume();
  const notifications = useNotificationCount();
  const health = useServerHealth();

  const healthDotColor = health.loading
    ? "bg-[var(--text-muted)]"
    : health.status === "healthy"
      ? "bg-[var(--accent-green)]"
      : health.status === "degraded"
        ? "bg-[var(--accent-blue)]"
        : "bg-[var(--accent-red)]";

  const VolumeIcon =
    volume.muted || volume.volume === 0
      ? VolumeX
      : volume.volume < 50
        ? Volume1
        : Volume2;
  const volumeColor =
    volume.muted || volume.volume === 0
      ? "text-[var(--text-muted)]"
      : "text-[var(--accent-blue)]";

  const ConnIcon = !network.online ? WifiOff : Wifi;
  const connColor = network.online
    ? "text-[var(--accent-green)]"
    : "text-[var(--accent-red)]";

  const BatteryIcon = battery.charging
    ? BatteryCharging
    : (battery.level ?? 1) <= 0.1
      ? BatteryWarning
      : (battery.level ?? 1) <= 0.3
        ? BatteryLow
        : (battery.level ?? 1) >= 0.8
          ? BatteryFull
          : BatteryMedium;

  const batteryColor = battery.charging
    ? "text-[var(--accent-green)]"
    : battery.level === null
      ? "text-[var(--text-secondary)]"
      : battery.level < 0.5
        ? "text-[var(--accent-red)]"
        : battery.level < 0.7
          ? "text-[var(--accent-amber)]"
          : "text-[var(--accent-green)]";

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/drilling/tools?tab=tasks"
        className={cn(
          "flex items-center justify-center w-[26px] h-[26px] rounded-full",
          "bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.05]",
          "transition-colors active:scale-[0.97]",
        )}
        title="Task Manager"
      >
        <CheckSquare className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
      </Link>

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="System Tray Popover"
            title="System status & options"
            className={cn(
              "flex items-center gap-2 h-[26px] px-2.5 rounded-full select-none cursor-default outline-none",
              "bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.05]",
              "transition-colors active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50",
            )}
          >
            {/* Server health dot */}
            <span className="relative flex h-2 w-2">
              {health.status === "healthy" && !health.loading && (
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-[var(--accent-green)] opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  healthDotColor,
                )}
              />
            </span>
            <span className="w-[1px] h-3 bg-black/[0.08]" />

            <VolumeIcon className={cn("w-3.5 h-3.5", volumeColor)} />
            <span className="w-[1px] h-3 bg-black/[0.08]" />
            <ConnIcon className={cn("w-3.5 h-3.5", connColor)} />
            <span className="w-[1px] h-3 bg-black/[0.08]" />
            <div className="flex items-center gap-0.5">
              <BatteryIcon className={cn("w-3.5 h-3.5", batteryColor)} />
              {battery.supported && battery.level !== null && (
                <span className="text-[11px] font-medium text-[var(--text-heading)] leading-none">
                  {Math.round(battery.level * 100)}%
                </span>
              )}
            </div>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={6}
            className={cn(
              "w-64 bg-white/95 backdrop-blur-2xl border border-black/[0.08] shadow-window rounded-xl p-3 z-[120]",
              "flex flex-col gap-2 select-none focus:outline-none",
            )}
          >
            <div className="space-y-3">
              {/* Server Health Section */}
              <ServerHealthRow
                status={health.status}
                db={health.db}
                redis={health.redis}
                aiRouter={health.aiRouter}
                responseTime={health.responseTime}
                loading={health.loading}
              />

              <div className="h-[1px] bg-black/[0.05]" />

              {/* Volume Slider Section */}
              <VolumeControlRow {...volume} />

              <div className="h-[1px] bg-black/[0.05]" />

              {/* Network details Section */}
              <NetworkStatusRow {...network} />

              <div className="h-[1px] bg-black/[0.05]" />

              {/* Battery details Section */}
              <BatteryStatusRow {...battery} />

              <div className="h-[1px] bg-black/[0.05]" />

              {/* Notifications Section */}
              <NotificationRow
                count={notifications.count}
                clear={notifications.clear}
              />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
