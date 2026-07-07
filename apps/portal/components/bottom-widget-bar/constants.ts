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
  Bot,
} from "lucide-react";

export const DEPARTMENTS_LIST = [
  {
    type: "engineering" as const,
    label: "Engineering",
    icon: Factory,
    color: "text-accent-blue",
  },
  {
    type: "drilling" as const,
    label: "Drilling",
    icon: Drill,
    color: "text-accent-green",
  },
  {
    type: "access-control" as const,
    label: "Access",
    icon: ShieldCheck,
    color: "text-accent-orange",
  },
  {
    type: "training" as const,
    label: "Training",
    icon: GraduationCap,
    color: "text-accent-purple",
  },
  {
    type: "satellite" as const,
    label: "Satellite",
    icon: Satellite,
    color: "text-accent-teal",
  },
  {
    type: "maintenance" as const,
    label: "Maintenance",
    icon: Wrench,
    color: "text-accent-yellow",
  },
  {
    type: "safety" as const,
    label: "Safety",
    icon: HardHat,
    color: "text-accent-red",
  },
];

export const PRODUCTIVITY_LIST = [
  {
    type: "dashboard" as const,
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "text-accent-blue",
  },
  {
    type: "reports" as const,
    label: "Reports",
    icon: CheckSquare,
    color: "text-accent-green",
  },
  {
    type: "admin" as const,
    label: "Admin",
    icon: Shield,
    color: "text-accent-purple",
  },
];

export const OUTER_ITEMS = [
  {
    href: "/access-control",
    label: "Access",
    icon: ShieldCheck,
  },
  {
    href: "/drilling",
    label: "Drilling",
    icon: Drill,
  },
  {
    href: "/engineering",
    label: "Eng",
    icon: Factory,
  },
  {
    href: "/training",
    label: "Training",
    icon: GraduationCap,
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
  {
    type: "eve" as const,
    label: "eve",
    icon: Bot,
    color: "text-accent-blue",
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
  return {
    x: Math.max(80, Math.min(window.innerWidth - 80, pos.x)),
    y: Math.max(80, Math.min(window.innerHeight - 80, pos.y)),
  };
}
