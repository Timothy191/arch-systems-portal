# Design Specifications: Engineering Module

## 1. Design System & Aesthetics
A detailed engineering dashboard utilizing purple accents (`--accent-violet`) and mechanical symbols. Relies heavily on visual graphs, gauges, and structural cards to represent mechanical components.

## 2. Key UI Layouts & Components
- **Breakdown Feed**: Grid of machinery cards detailing breakdown reason, severity, and assigned technician.
- **Tire Matrix**: Interactive blueprint schematic showing the tire configuration of haul trucks.
- **Parts Inventory**: Data table showing availability and location of vital repair parts.

## 3. Micro-Animations & Interactions
- **Tire Pressure Glow**: Tires with abnormal pressure glow amber or red and pulse slowly on the truck blueprint.
- **Severity Badge Transition**: Hovering over a breakdown card raises its z-index slightly and expands the action buttons.
- **Log Filters**: Smooth accordion tabs filter breakdowns by status (Pending, In Progress, Resolved).

## 4. Typography & Color Palette (Semantic Tokens)
Uses robust, clean typography (`Outfit` and `Inter`). Colors: Violet primary (`--accent-violet`), safety orange for alerts, and dark grey backgrounds.

## 5. Responsive Behavior & Breakpoints
Tire schematic scales down on smaller screens, and tables convert to card lists for technicians using mobile devices in the field.
