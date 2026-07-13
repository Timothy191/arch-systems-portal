# Design Specifications: Access Control Module

## 1. Design System & Aesthetics
A clean, high-contrast security terminal design with prominent amber/red/green status indicators. Designed to minimize cognitive load so security officers can identify issues instantly.

## 2. Key UI Layouts & Components
- **Swipe Console**: A dual-pane layout containing live access events on the left and a detailed inspection panel on the right.
- **Personnel Directory**: A searchable table of all active badges, visitors, and contractors.
- **Visitor Form**: A clean, single-column wizard for quick registration of incoming guests.

## 3. Micro-Animations & Interactions
- **Swipe Flash Alert**: When access is denied, the corresponding log item flashes red using CSS keyframe animations.
- **Search Auto-suggest**: Typing in the directory dynamically highlights matching records instantly.
- **Badge Hover Details**: Hovering over a badge number reveals the owner's photo and clearance levels.

## 4. Typography & Color Palette (Semantic Tokens)
Uses bold monospaced fonts for timestamps and ID codes to replicate terminal efficiency. Primary colors: Steel blue (`--accent-blue`), danger red (`--accent-red`), and warning orange (`--accent-warning`).

## 5. Responsive Behavior & Breakpoints
Maintains a full-width console view on desktop, and collapses into a vertically-stacked feed on mobile and patrol tablets.
