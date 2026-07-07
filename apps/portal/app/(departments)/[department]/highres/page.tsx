import { SatelliteMonitoringDashboard } from "@/features/departments/components/satellite/SatelliteMonitoringDashboard";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function HighResPage() {
  return <SatelliteMonitoringDashboard defaultTab="highres" />;
}
