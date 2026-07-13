# Design Specifications: Control Room Module

## 1. Design System & Aesthetics
A high-density dashboard featuring dark themes, minimal borders, and vibrant red/orange indicators (`--accent-red`, `--accent-warning`) for alarms. Inspired by aerospace telemetry consoles.

## 2. Key UI Layouts & Components
- **Control Panel Grid**: High-density grid displaying SCADA feeds, delay streams, and live excavator charts side-by-side.
- **Hourly Load Histogram**: Bar charts outlining production speed over a 24-hour window.
- **Rollover Wizard**: Multi-step vertical form to log shift handover checkmarks.

## 3. Micro-Animations & Interactions
- **Alarm Dismissal**: Dismissing a SCADA alarm triggers a slide-out transition with a success toast notification.
- **Chart Hover Tooltips**: Moving the cursor over the load histogram displays exact tons moved in a floating popover.
- **Status Dot Pulsing**: Active sensors pulse with a green glow, while disconnected sensors flash grey.

## 4. Typography & Color Palette (Semantic Tokens)
Uses `Outfit` for display data and `Roboto Mono` for numbers and telemetry streams. Colors: Red alerts (`--accent-red`), dark slate grids (`--bg-secondary`), and high-brightness text.

## 5. Responsive Behavior & Breakpoints
Maintains a multi-pane layout on ultra-wide screens. On smaller monitors, panes stack vertically with tabbed navigations.
