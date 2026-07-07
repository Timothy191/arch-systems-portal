import { env } from "@/lib/env";
import {
  Drill,
  Factory,
  ShieldCheck,
  Wrench,
  Radar,
  HardHat,
  GraduationCap,
  Satellite,
  CheckSquare,
  LayoutDashboard,
  Shield,
  Briefcase,
  Workflow,
} from "lucide-react";

export const DEPARTMENTS_LIST = [
  {
    name: "drilling",
    displayName: "Drilling Operations",
    icon: Drill,
    color: "text-accent-blue",
  },
  {
    name: "production",
    displayName: "Production Tracking",
    icon: Factory,
    color: "text-accent-green",
  },
  {
    name: "access-control",
    displayName: "Access Control",
    icon: ShieldCheck,
    color: "text-accent-blue",
  },
  {
    name: "engineering",
    displayName: "Engineering",
    icon: Wrench,
    color: "text-accent-blue",
  },
  {
    name: "control-room",
    displayName: "SCADA Control Room",
    icon: Radar,
    color: "text-accent-red",
  },
  {
    name: "safety",
    displayName: "Safety Compliance",
    icon: HardHat,
    color: "text-accent-amber",
  },
  {
    name: "training",
    displayName: "Training & LMS",
    icon: GraduationCap,
    color: "text-accent-blue",
  },
  {
    name: "satellite-monitoring",
    displayName: "Satellite Monitoring",
    icon: Satellite,
    color: "text-accent-blue",
  },
];

export const PRODUCTIVITY_LIST = [
  {
    name: "tasks",
    displayName: "Tasks",
    icon: CheckSquare,
    colorClass: "text-accent-green",
  },
  {
    name: "documents",
    displayName: "Documents",
    icon: CheckSquare,
    colorClass: "text-accent-blue",
  },
  {
    name: "schedule",
    displayName: "Schedule",
    icon: CheckSquare,
    colorClass: "text-accent-red",
  },
  {
    name: "calculations",
    displayName: "Calculations",
    icon: CheckSquare,
    colorClass: "text-accent-blue",
  },
  {
    name: "notes",
    displayName: "Notes",
    icon: CheckSquare,
    colorClass: "text-accent-amber",
  },
];

export const OUTER_ITEMS = [
  { href: "/", label: "Hub", icon: LayoutDashboard, color: "text-[var(--text-muted)]" },
  {
    href: "/drilling",
    label: "Drilling",
    icon: Drill,
    color: "text-accent-blue",
  },
  {
    href: "/production",
    label: "Production",
    icon: Factory,
    color: "text-accent-green",
  },
  {
    href: "/access-control",
    label: "Access",
    icon: ShieldCheck,
    color: "text-accent-blue",
  },
  {
    href: "/engineering",
    label: "Engineering",
    icon: Wrench,
    color: "text-accent-blue",
  },
  {
    href: "/control-room",
    label: "Control",
    icon: Radar,
    color: "text-accent-red",
  },
  {
    href: "/safety",
    label: "Safety",
    icon: HardHat,
    color: "text-accent-blue",
  },
  {
    href: "/training",
    label: "Training",
    icon: GraduationCap,
    color: "text-accent-blue",
  },
  {
    href: "/satellite-monitoring",
    label: "Satellite",
    icon: Satellite,
    color: "text-accent-blue",
  },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    color: "text-accent-blue",
  },
];

export const INNER_ITEMS = [
  {
    type: "operations" as const,
    label: "Ops",
    icon: Briefcase,
    color: "text-accent-blue",
  },
  {
    type: "tools" as const,
    label: "Tools",
    icon: Wrench,
    color: "text-accent-blue",
  },
  {
    href: env.NEXT_PUBLIC_N8N_URL || "#",
    label: "n8n",
    icon: Workflow,
    color: "text-accent-red",
  },
];


/**
 * Key used to persist the dock's xy coordinates in localStorage.
 */
export const POS_STORAGE_KEY = "arch-dock-pos";
export const DRAG_THRESHOLD = 4;

/**
 * Two-dimensional coordinate representation for widget bar positioning.
 */
export interface DockPosition {
  x: number;
  y: number;
}

/**
 * Ensures the dock remains within visible viewport boundaries.
 * Leaves an 80px margin to account for the expanded wheel radius.
 */
export function clampDockPosition(pos: DockPosition): DockPosition {
  if (typeof window === "undefined") return pos;
  const margin = 80; // enough for wheel radius
  return {
    x: Math.max(margin, Math.min(window.innerWidth - margin, pos.x)),
    y: Math.max(margin, Math.min(window.innerHeight - margin, pos.y)),
  };
}

