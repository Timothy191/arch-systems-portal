# Design Specifications: Admin Module

## 1. Design System & Aesthetics
A highly structured, administrative command panel using violet accents (`--accent-violet`) and robust data grids. Emphasizes clean borders, compact row padding, and absolute clarity.

## 2. Key UI Layouts & Components
- **Admin Console**: Multi-tab panel separating employee management, shifts, and system health statistics.
- **Roster Grid**: A calendar-like calendar grid mapping employees to shifts.
- **Audit Logs Table**: Detailed log table with search filters to audit portal activity.

## 3. Micro-Animations & Interactions
- **Modal Slide-In**: Adding an employee slides in a clean form from the right side of the screen.
- **Toggle Animation**: Enabling/disabling features uses a custom-styled toggle switch with a smooth spring transition.
- **Drag-and-Drop Shifts**: Administrators can drag employees between shift cards to reassign them.

## 4. Typography & Color Palette (Semantic Tokens)
Uses professional `Outfit` and monospaced font family for system IDs. Colors: Violet (`--accent-violet`), steel grey, and dark background.

## 5. Responsive Behavior & Breakpoints
Admin screens are designed for desktop monitors but support collapsing tables into card lists for mobile administration.
