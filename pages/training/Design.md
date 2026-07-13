# Design Specifications: Training Module

## 1. Design System & Aesthetics
A modern educational portal layout with clear progress metrics, bright status indicators, and clean navigation. Uses a cyan accent theme (`--accent-cyan`).

## 2. Key UI Layouts & Components
- **Overview Panel**: Visual charts showing training progress, upcoming courses, and certification status.
- **Course Directory**: Grid of cards featuring course title, duration, capacity, and registration button.
- **Schedule Calendar**: Clean list of upcoming courses by date and location.

## 3. Micro-Animations & Interactions
- **Registration Button Transition**: Registering for a course triggers a loading animation and updates the button state to 'Registered' with a checkmark.
- **Progress Circle**: Interactive circular progress bars showing course completion percentage.
- **Certification Expiry Warning**: Expiring credentials flash a warning badge when hovered.

## 4. Typography & Color Palette (Semantic Tokens)
Uses friendly `Outfit` for course titles and clear `Inter` for metadata. Colors: Cyan accents (`--accent-cyan`), slate background, and clear contrast ratios.

## 5. Responsive Behavior & Breakpoints
Cards fit cleanly on mobile layouts. Calendar switches to a list view on smaller screens to prevent horizontal scrolling issues.
