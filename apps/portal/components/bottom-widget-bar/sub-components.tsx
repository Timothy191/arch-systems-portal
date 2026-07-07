"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@repo/ui/lib/utils";
import { env } from "@/lib/env";
import { Workflow, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@repo/ui/components/ui/dropdown-menu";

import {
  DEPARTMENTS_LIST,
  PRODUCTIVITY_LIST,
  OUTER_ITEMS,
  INNER_ITEMS,
} from "./constants";
/**
 * Calculates the Cartesian coordinates for a wheel item based on its index.
 */
export function getAngle(
  index: number,
  total: number,
  dockPosition:
    | "bottom"
    | "top-right"
    | "top-center"
    | "left-center" = "bottom",
) {
  if (dockPosition === "top-right") {
    // Top-right corner: sweep from 90 degrees (down) to 180 degrees (left)
    const startAngle = Math.PI / 2;
    const sweep = Math.PI / 2;
    return startAngle + (index / Math.max(1, total - 1)) * sweep;
  }
  if (dockPosition === "top-center") {
    // Top-center: sweep downwards from 0 (right) to PI (left)
    const startAngle = 0;
    const sweep = Math.PI;
    return startAngle + (index / Math.max(1, total - 1)) * sweep;
  }
  if (dockPosition === "left-center") {
    // Left-center: sweep into screen from -70 to +70 degrees
    const startAngle = -Math.PI / 2 + 0.22;
    const sweep = Math.PI - 0.44;
    return startAngle + (index / Math.max(1, total - 1)) * sweep;
  }
  // Default bottom: sweep upwards from PI (left) to 2PI (right)
  const sweep = Math.PI;
  return Math.PI + (index / Math.max(1, total - 1)) * sweep;
}

/**
 * Base interactive item rendered along the circumference of the main widget wheel.
 */
export function WheelItem({
  item,
  angle,
  radius,
  index,
  isActive,
  onNavigate,
  side = "top",
}: {
  item: (typeof OUTER_ITEMS)[number] | (typeof INNER_ITEMS)[number];
  angle: number;
  radius: number;
  index: number;
  isActive: boolean;
  onNavigate: () => void;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const Icon = item.icon;
  const label = "label" in item ? item.label : "";
  const color = "color" in item ? item.color : "";

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
      animate={{ x, y, opacity: 1, scale: 1 }}
      exit={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
      transition={{
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.025,
      }}
      className="absolute left-1/2 top-1/2 z-50"
    >
      <div className="-translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        {"href" in item && item.href !== undefined ? (
          item.href.startsWith("http") ? (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavigate}
              className={cn(
                "relative flex items-center justify-center w-11 h-11 rounded-full",
                "liquid-glass-light border border-white/40 shadow-window",
                "hover:bg-white/90 active:scale-[0.97]",
                "transition-colors",
              )}
            >
              <Icon className={cn("w-5 h-5", color)} />
              {isActive && (
                <div
                  className={cn(
                    "absolute bottom-1 w-1 h-1 rounded-full bg-current",
                    color,
                  )}
                />
              )}
            </a>
          ) : (
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center justify-center w-11 h-11 rounded-full",
                "liquid-glass-light border border-white/40 shadow-window hover:bg-white/90 active:scale-[0.97]",
                "transition-colors",
                isActive && "ring-1 ring-black/[0.08] bg-white/90",
              )}
            >
              <Icon className={cn("w-5 h-5", color)} />
              {isActive && (
                <div
                  className={cn(
                    "absolute bottom-1 w-1 h-1 rounded-full bg-current",
                    color,
                  )}
                />
              )}
            </Link>
          )
        ) : "type" in item && item.type === "operations" ? (
          <OperationsWheelItem
            onNavigate={onNavigate}
            color={color}
            icon={Icon}
            side={side}
          />
        ) : "type" in item && item.type === "tools" ? (
          <ToolsWheelItem
            onNavigate={onNavigate}
            color={color}
            icon={Icon}
            side={side}
          />
        ) : null}
        <span className="text-[10px] font-medium text-[var(--text-heading)] whitespace-nowrap leading-none">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Sub-menu ring dedicated to primary department navigation.
 */
export function OperationsWheelItem({
  onNavigate,
  color,
  icon: Icon,
  side = "top",
}: {
  onNavigate: () => void;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center w-11 h-11 rounded-full",
            "liquid-glass-light border border-white/40 shadow-window hover:bg-white/90 active:scale-[0.97]",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]",
          )}
        >
          <Icon className={cn("w-5 h-5", color)} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        sideOffset={12}
        align="center"
        className="bg-white/95 backdrop-blur-2xl shadow-window border border-black/[0.08] rounded-xl py-1 w-60 z-[100]"
      >
        {DEPARTMENTS_LIST.map((dept) => {
          const DeptIcon = dept.icon;
          return (
            <DropdownMenuItem
              key={dept.name}
              asChild
              className="cursor-pointer hover:bg-black/[0.04] focus:bg-black/[0.04] rounded-md mx-1 my-0.5"
            >
              <Link
                href={`/${dept.name}`}
                onClick={onNavigate}
                className="w-full flex items-center px-2 py-1.5"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center mr-2.5 shrink-0 bg-black/[0.03]">
                  <DeptIcon className={cn("w-3.5 h-3.5", dept.color)} />
                </div>
                <span className="text-[13px] font-medium text-[var(--text-heading)]">
                  {dept.displayName}
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Sub-menu ring for system tools, settings, and external integrations (e.g., n8n).
 */
export function ToolsWheelItem({
  onNavigate,
  color,
  icon: Icon,
  side = "top",
}: {
  onNavigate: () => void;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center w-11 h-11 rounded-full",
            "liquid-glass-light border border-white/40 shadow-window hover:bg-white/90 active:scale-[0.97]",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]",
          )}
        >
          <Icon className={cn("w-5 h-5", color)} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        sideOffset={12}
        align="center"
        className="bg-white/95 backdrop-blur-2xl shadow-window border border-black/[0.08] rounded-xl py-1 w-52 z-[100]"
      >
        {PRODUCTIVITY_LIST.map((tool) => {
          const ToolIcon = tool.icon;
          return (
            <DropdownMenuItem
              key={tool.name}
              asChild
              className="cursor-pointer hover:bg-black/[0.04] focus:bg-black/[0.04] rounded-md mx-1 my-0.5"
            >
              <Link
                href={`/drilling/tools?tab=${tool.name}`}
                onClick={onNavigate}
                className="w-full flex items-center px-2 py-1.5 gap-2.5"
              >
                <ToolIcon className={cn("w-4 h-4 shrink-0", tool.colorClass)} />
                <span className="text-[13px] font-medium text-[var(--text-heading)]">
                  {tool.displayName}
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="bg-black/[0.06] my-1 mx-1" />
        <DropdownMenuItem
          asChild
          className="cursor-pointer hover:bg-black/[0.04] focus:bg-black/[0.04] rounded-md mx-1 my-0.5"
        >
          <a
            href={env.NEXT_PUBLIC_N8N_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-2 py-1.5"
          >
            <div className="flex items-center gap-2.5">
              <Workflow className="w-4 h-4 shrink-0 text-[#ea4b2a]" />
              <span className="text-[13px] font-medium text-[var(--text-heading)]">
                n8n Workflows
              </span>
            </div>
            <ExternalLink className="h-3 w-3 opacity-40" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
