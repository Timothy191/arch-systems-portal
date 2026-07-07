import { GlassSkeleton } from "@repo/ui/components/ui/glass-skeleton";

// AGENT-TRACE: root loading renders INSIDE <main> in the root layout, so the
// app chrome (header, command bar, system tray) already persists across the
// load. The previous version used `min-h-screen flex items-center justify-center`,
// which painted a centered max-w-md card that read as a full reload flash on
// every root-segment navigation. Replaced with a quiet, in-flow skeleton that
// mirrors a real dashboard's first paint — perceived nav speed win, zero flash.
export default function RootLoading() {
  return (
    <div
      className="space-y-6 p-6 sm:p-8"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <GlassSkeleton showHeader rows={2} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassSkeleton rows={3} />
        <GlassSkeleton rows={3} />
        <GlassSkeleton rows={3} />
      </div>
      <GlassSkeleton className="h-48" rows={1} />
    </div>
  );
}
