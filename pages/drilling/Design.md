# Design Specifications: Drilling Module

## 1. Design System & Aesthetics
A telemetry-dense, high-precision layout with cool blue accents (`--accent-blue`) symbolizing deep Earth operations. Utilizes modern glassmorphic panels against dark backgrounds to give a sci-fi, telemetry-center feel.

## 2. Key UI Layouts & Components
- **Telemetry Dashboard**: A grid of real-time indicators featuring live depth tickers and sparklines.
- **Drilling Log Table**: A chronological list of daily drilling events with quick filter capabilities.
- **Telemetry Details**: In-depth charts visualizing drilling metrics over time.

## 3. Micro-Animations & Interactions
- **Live Sparkline Hover**: Hovering over sparklines reveals precise values with a smooth transition.
- **Log Card Flip**: Drilling log summary cards expand gracefully when clicked to reveal detailed notes.
- **Quick Action Glow**: Buttons for logging shifts have a soft blue pulsing shadow to guide the user's attention.

## 4. Typography & Color Palette (Semantic Tokens)
Uses `Outfit` for display headings and `Inter` for data tables. Primary colors: Indigo-blue primary (`--accent-blue`), charcoal backgrounds (`--bg-primary`), and ice-white text (`--text-heading`).

## 5. Responsive Behavior & Breakpoints
Cards collapse into a single-column scroll on mobile viewports. On desktop, they snap into a multi-column dashboard grid leveraging CSS Grid tailwind-aliases.
