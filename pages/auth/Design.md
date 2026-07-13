# Design Specifications: Authentication & Security Module

## 1. Design System & Aesthetics
A minimalist, hyper-secure login box centered on the screen. Utilizes premium glassmorphism overlays and soft animated background gradients to feel modern and premium.

## 2. Key UI Layouts & Components
- **Auth Layout**: Centered card template with floating ambient gradients in the background.
- **Form Panels**: Clean input fields with floating labels and icons (Key, User, Mail).

## 3. Micro-Animations & Interactions
- **Focus Glow**: Input fields glow with a soft blue outline when focused.
- **Error Shake**: Validation errors cause the login card to shake slightly using CSS animations.
- **Submit Transition**: Clicking 'Login' swaps the button text with a loading spinner cleanly.

## 4. Typography & Color Palette (Semantic Tokens)
Uses `Outfit` for large titles and `Inter` for forms. Colors: Sleek slate (`--bg-primary`), ice-white text, and accent blue focus outlines.

## 5. Responsive Behavior & Breakpoints
Autofitting container cards that scale down perfectly on mobile screens while maintaining high contrast readability.
