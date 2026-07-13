# Design Specifications: Operations Hub Module

## 1. Design System & Aesthetics
A majestic, state-of-the-art landing dashboard. Features glassmorphism, responsive grids, and deep violet/indigo gradients to create a premium command-center experience.

## 2. Key UI Layouts & Components
- **Hub Grid**: Multi-column dashboard layout organizing department summaries and quick actions.
- **Command Bar Overlay**: Centered modal search window with backdrop blur.
- **System Tray**: Header control bar displaying notifications, profile details, and theme controllers.

## 3. Micro-Animations & Interactions
- **Card Hover Pulse**: Department cards lift slightly and outline with a glowing border when hovered.
- **Command Bar Fade**: Search overlays fade in and scale up smoothly upon invoking the hotkey.
- **Tray Slide**: Clicking system tray elements slides down specific menu overlays.

## 4. Typography & Color Palette (Semantic Tokens)
Uses bold `Outfit` for large titles and metrics, and `Inter` for labels. Colors: Premium glass (`--bg-glass`), primary text, and mixed accent status lights.

## 5. Responsive Behavior & Breakpoints
Fully responsive flex grids collapsing seamlessly from 4 columns on desktop down to a single card scroll on mobile.
