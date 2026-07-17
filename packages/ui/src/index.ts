/**
 * @repo/ui — shared React primitives (shadcn-style)
 * Re-export all components from a single entry point.
 */

export { Button } from "./components/button";
export { Card, CardHeader, CardTitle, CardContent } from "./components/card";
export { Badge } from "./components/badge";
export { Spinner } from "./components/spinner";

// Legacy compatibility exports
export { Logo } from "./components/Logo";
export { GlassCard } from "./components/GlassCard";
export { Input } from "./components/Input";
export { AnimatedButton } from "./components/AnimatedButton";
export { PageHeader } from "./components/PageHeader";
export { DepartmentLayout } from "./components/DepartmentLayout";
export { SecondaryButton } from "./components/SecondaryButton";
export { KPI } from "./components/KPI";
export { AnimatedList } from "./components/AnimatedList";
export { Marquee } from "./components/Marquee";
export { Checkbox } from "./components/Checkbox";

// UI components for sub-path imports
export { Button as ButtonUI } from "./components/ui/button";
export { Input as InputUI } from "./components/ui/input";
export { Badge as BadgeUI } from "./components/ui/badge";
export { Dialog } from "./components/ui/dialog";
export { Table, TableHeader, TableRow, TableCell } from "./components/ui/table";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
export { ActionConfirmDialog } from "./components/ui/action-confirm-dialog";

// Re-export utils
export { cn } from "./lib/utils";
