# Design Specifications: Safety Module

## 1. Design System & Aesthetics
A clean, trustworthy design with bright warning banners and clean compliance metrics. Uses blue/cyan/emerald to denote success and safety compliance, and yellow/red for hazards.

## 2. Key UI Layouts & Components
- **Safety Dashboard**: Highlights LTI-free days in a large, prominent central card.
- **Incident Report List**: chronological table displaying reported events categorized by severity.
- **Inspection Form**: A structured, step-by-step checklist form for safety inspections.

## 3. Micro-Animations & Interactions
- **LTI Counter Increment**: The LTI-free day counter animates upward with a counting effect on load.
- **Severity Color Coding**: Incidents dynamically change border colors based on severity (Critical = Red, Minor = Yellow).
- **Hazard Map Pinning**: Allows users to click on a site map to pin hazard locations.

## 4. Typography & Color Palette (Semantic Tokens)
Uses `Outfit` for bold numbers and `Inter` for document text. Colors: Safety blue (`--accent-blue`), success green (`--accent-emerald`), and charcoal background.

## 5. Responsive Behavior & Breakpoints
Forms are optimized for mobile phones, as safety inspections are performed on the go by personnel walking the site.
