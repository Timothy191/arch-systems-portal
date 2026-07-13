# Design Specifications: Production Module

## 1. Design System & Aesthetics
A sleek industrial look featuring vibrant emerald accents (`--accent-emerald`) representing yield, natural resources, and operational success. Prominent stats cards ensure immediate readability of key performance indicators.

## 2. Key UI Layouts & Components
- **Yield Dashboard**: A large visual summary highlighting tonnage, yield percentage, and progress towards the daily quota.
- **Daily Logs Feed**: A clean layout containing expandable logs grouped by date and shift.
- **Machines Overview**: Grid of active production machinery with color-coded status badges (Operational, Under Maintenance).

## 3. Micro-Animations & Interactions
- **Tonnage Progress Bar**: Fills with a smooth CSS-transition animation upon dashboard load.
- **Roster Hover**: Hovering over active crew names displays their designated equipment assignments.
- **Filter Animation**: Filtering production logs fades out inactive logs and reorganizes the grid fluidly.

## 4. Typography & Color Palette (Semantic Tokens)
Uses `Outfit` for headers and `Inter` for detailed tables. Primary colors: Emerald green (`--accent-emerald`), dark charcoal background (`--bg-primary`), and gray descriptions (`--text-muted`).

## 5. Responsive Behavior & Breakpoints
Optimized for rugged tablets used on-site: larger tap targets, flexbox-wrap layouts, and collapsible side menus.
