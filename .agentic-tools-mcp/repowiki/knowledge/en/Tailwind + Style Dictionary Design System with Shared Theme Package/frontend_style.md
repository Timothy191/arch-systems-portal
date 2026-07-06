The frontend styling system is built around a shared @repo/theme package that centralizes design tokens, Tailwind presets, and CSS variables consumed by all three Next.js applications (portal, overview, cms) and the shared @repo/ui component library. The architecture follows a clear separation of concerns:

Token Pipeline: Design tokens are authored in JSON and processed through Style Dictionary to generate TypeScript types, CSS custom properties, and React context values. The theme package exposes multiple entry points via package.json exports: ./css, ./tokens, ./react, ./tailwind, and ./motion. A build script and watch mode keep generated outputs synchronized with source tokens.

Tailwind Architecture: Each app's tailwind.config.ts re-exports the shared preset from @repo/theme/tailwind rather than duplicating configuration. Apps extend this base with their own content globs. The @repo/ui package also re-exports the same preset, ensuring consistent utility classes across the monorepo.

CSS Layering Strategy: Global styles follow Tailwind's layer convention (@layer base/components/utilities). The @repo/ui/src/globals.css imports @repo/theme/css first, then applies Tailwind directives and defines application-wide animations (shine, marquee, aurora-shadow, glass-shimmer, caustic-glow) as CSS keyframes exposed via @theme inline. Custom utilities define z-index matrices, focus modes, and brand-specific classes.

Theme Variables: CSS custom properties provide semantic naming for colors (--bg-primary, --text-heading, --accent-cyan), borders (--border-default, --border-subtle), surfaces (--glass-surface, --vibrancy-surface), and elevation levels. These variables cascade into third-party components like XYFlow, RevoGrid, and Radix UI primitives.

Focus Mode: A complete dark atmospheric theme override is implemented via body.focus-mode class selectors using :is() pseudo-class for specificity control. This switches all surfaces, text, borders, and shadows to a dark glass palette optimized for reading over background imagery.

Component Library: @repo/ui provides reusable React components built on Radix UI primitives, Framer Motion animations, and Tailwind utilities. Components use class-variance-authority and tailwind-merge for variant composition. The package exports both individual components (GlassCard, CyberButton, DataGrid) and grouped paths (./components/_, ./lib/_).

Styling Conventions:

- All apps import global CSS via globals.css files that chain @import "@repo/theme/css" -> Tailwind directives -> custom layers
- Animation definitions live in @theme inline blocks for tree-shaking efficiency
- Third-party overrides use CSS custom property injection rather than direct style manipulation
- Focus management uses skip-link patterns and visible focus rings via .focus-ring-arch-blue
- Brand colors are defined as --arch-brand-\* variables with utility classes for consistency
