# XHS Cute Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Sweet, adorable, girly, and approachable. A classic Xiaohongshu aesthetic that radiates warmth and charm.
- **Emotional Description:** Playful, soft, inviting, and heartwarming. It feels like a cozy diary page filled with stickers and pastel dreams.
- **Key Characteristics:**
  - Soft, rounded shapes with bubbly, friendly forms.
  - Pastel color palette with pink, peach, mint, and lavender dominance.
  - Sticker-style decorations including hearts, stars, sparkles, and cute faces.
  - Ribbon decorations and polaroid-style frames.
  - Rounded, bubbly hand lettering with soft shadows.
  - Creamy, glowing image filters that enhance skin tones.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Pink** | `#FED7E2` | Main backgrounds, soft highlights, primary accents |
| **Primary Peach** | `#FEEBC8` | Warm backgrounds, skin-tone glows, secondary accents |
| **Primary Mint** | `#C6F6D5` | Success states, nature elements, fresh highlights |
| **Primary Lavender** | `#E9D8FD` | Info states, dreamy accents, tertiary backgrounds |
| **Secondary Hot Pink** | `#FF69B4` | Strong accents, badges, emphasis text |
| **Secondary Coral** | `#FF6B6B` | Warnings, energetic accents, heart icons |
| **Interactive Pink** | `#F687B3` | Hover states, active elements, focus rings |
| **Neutral 900** | `#1A202C` | Primary text |
| **Neutral 700** | `#4A5568` | Secondary text |
| **Neutral 400** | `#A0AEC0` | Placeholder text, subtle borders |
| **Neutral 200** | `#E2E8F0` | Dividers, light borders |
| **Surface Cream** | `#FFFAF0` | Main page background, warm canvas |
| **Surface Soft Pink** | `#FFF5F7` | Card backgrounds, panels, bubble fills |
| **Surface White** | `#FFFFFF` | Clean sections, input backgrounds |
| **Semantic Success** | `#48BB78` | Success states (mint alternative) |
| **Semantic Warning** | `#ECC94B` | Warnings, pending states |
| **Semantic Error** | `#F56565` | Errors, destructive actions |
| **Semantic Info** | `#4299E1` | Informational callouts |

## 3. Typography Rules

- **Font Family:** A rounded, bubbly sans-serif (e.g., Quicksand, Nunito, or Varela Round) for all text. Optionally use a hand-lettering style font for decorative headers.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Rounded Sans | 48px / 3rem | 800 | 1.1 | -0.01em | Bubbly, soft shadows, pastel color |
| H1 | Rounded Sans | 36px / 2.25rem | 700 | 1.2 | -0.005em | Section titles, rounded feel |
| H2 | Rounded Sans | 26px / 1.625rem | 700 | 1.3 | 0 | Sub-section headers |
| H3 | Rounded Sans | 20px / 1.25rem | 600 | 1.4 | 0 | Card titles |
| Body | Rounded Sans | 16px / 1rem | 400 | 1.6 | 0 | Main readable text |
| Body Small | Rounded Sans | 14px / 0.875rem | 400 | 1.5 | 0.005em | Captions, metadata |
| Label | Rounded Sans | 12px / 0.75rem | 700 | 1.4 | 0.05em | Uppercase, badges, tags (pill shape) |
| Button | Rounded Sans | 16px / 1rem | 700 | 1 | 0.01em | Bold and friendly |
| Sticker Text | Hand-lettering | 18px / 1.125rem | 400 | 1.3 | 0.02em | Decorative labels, sticker captions |

- **Principles:** All text should feel friendly and approachable. Use soft shadows on headers for a "puffy" effect. Avoid sharp, angular fonts.

## 4. Component Stylings

### Buttons
- **Primary:** Gradient from Primary Pink `#FED7E2` to a lighter pink, white or dark text, 9999px border-radius (pill shape), soft shadow.
- **Secondary:** Flat Primary Peach `#FEEBC8`, dark text, 9999px border-radius, soft shadow.
- **Accent:** Flat Hot Pink `#FF69B4`, white text, 9999px border-radius, soft shadow.
- **Ghost:** Transparent background, 2px solid Primary Pink border, pink text, 9999px border-radius.

### Cards & Containers
- **Card:** Surface Soft Pink `#FFF5F7` background, no border, 16px border-radius, soft shadow.
- **Polaroid Frame:** White `#FFFFFF` background with thick padding, 8px border-radius, soft shadow, like a polaroid photo.
- **Bubble Panel:** Surface Soft Pink `#FFF5F7` background, 9999px border-radius (fully rounded), soft shadow.

### Inputs & Forms
- **Text Input:** White `#FFFFFF` background, 2px solid Primary Pink `#FED7E2` border, 9999px border-radius (pill), soft inner shadow.
- **Focus State:** Border changes to Hot Pink `#FF69B4`, add a pink glow.
- **Checkbox/Radio:** Rounded square/circle, 2px pink border, pink fill with a white checkmark when checked.

### Navigation
- **Nav Bar:** Surface Cream `#FFFAF0` background, soft bottom shadow.
- **Nav Item:** Rounded sans text in Neutral 700, hover turns Hot Pink.
- **Active Nav Item:** Pill-shaped button with Primary Pink `#FED7E2` fill and dark text.

### Image Treatment
- Images should have rounded corners (12px+).
- Optional white stroke border or polaroid frame.
- Soft glow or cream-skin filter aesthetic.
- Optional sticker decorations overlaid on images.

### Distinctive Components
- **Sticker Badge:** Small decorative badge shaped like a heart, star, or flower. Bright colors, white outline, soft shadow.
- **Ribbon Tag:** A tag with ribbon-like ends, pastel color, rounded text.
- **Tape Corner:** Decorative element that looks like washi tape holding a photo to the page.
- **Sparkle Decoration:** Small star/sparkle icons scattered around key elements.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px.
- **Grid & Container:**
  - Max container width: 1200px.
  - 12-column grid with 24px gutters.
  - Asymmetric, playful layouts encouraged.
- **Whitespace Philosophy:** Soft and airy. Whitespace should feel like breathing room in a cozy room. Avoid harsh, rigid spacing.
- **Border Radius Scale:**
  - Small: 8px (small tags, badges)
  - Medium: 12px (cards, inputs)
  - Large: 16px (panels, modals)
  - Full: 9999px (pills, buttons, bubbles)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat | Base layer |
| 1 | `box-shadow: 0 2px 8px rgba(254, 215, 226, 0.4)` | Resting cards, buttons |
| 2 | `box-shadow: 0 4px 12px rgba(254, 215, 226, 0.5)` | Hover cards, dropdowns |
| 3 | `box-shadow: 0 8px 24px rgba(254, 215, 226, 0.6)` | Modals, popovers |

- **Shadow Philosophy:** Soft, pastel-tinted shadows that feel fluffy and light. Shadows should be colored (pink/peach tint) rather than pure black/gray to maintain the cute aesthetic.

## 7. Do's and Don'ts

- **DO:**
  - Use rounded, bubbly shapes (high border-radius).
  - Apply pastel colors generously.
  - Include sticker-style decorations (hearts, stars, flowers).
  - Use pill-shaped buttons and tags.
  - Add soft, colored shadows.
  - Use rounded, friendly typography.
- **DON'T:**
  - Use sharp corners or angular shapes.
  - Apply dark, harsh shadows.
  - Use muted or dark color schemes.
  - Create rigid, grid-perfect layouts.
  - Use standard, corporate-looking fonts.
  - Apply heavy outlines or borders.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, panels stack, nav becomes bottom tab bar with cute icons |
| Tablet | 640px - 1024px | 2-column grid, side panels become overlays |
| Desktop | > 1024px | Full multi-column grid, playful asymmetric layouts |

- **Touch Targets:** Minimum 48x48px for all interactive elements.
- **Collapsing Strategy:** Cute cards stack vertically. Navigation collapses into a friendly bottom tab bar with rounded icons.
- **Image Behavior:** Images maintain aspect ratio, rounded corners persist. Polaroid frames scale proportionally.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#FED7E2` (Pink), `#FEEBC8` (Peach), `#C6F6D5` (Mint), `#E9D8FD` (Lavender)
- Accents: `#FF69B4` (Hot Pink), `#FF6B6B` (Coral)
- Background: `#FFFAF0` (Cream), `#FFF5F7` (Soft Pink), `#FFFFFF` (White)
- Text: `#1A202C` (Primary), `#4A5568` (Secondary)

### Example Component Prompts

1. **Cute Pill Button:** "Create a button with a gradient from `#FED7E2` to a lighter pink, dark text, 9999px border-radius (fully pill-shaped), and a soft pink-tinted shadow."
2. **Polaroid Card:** "Design a card that looks like a polaroid photo. White background with thick padding, 8px border-radius on the image, soft shadow. Add a small heart sticker in the corner."
3. **Bubble Tag:** "Create a tag component with a `#FFF5F7` background, 9999px border-radius, soft shadow, and rounded sans-serif text. Add a small sparkle icon."
4. **Cute Input Field:** "Design a text input with a white background, a 2px solid `#FED7E2` border, 9999px border-radius, and a soft inner shadow. Focus state should glow pink."
5. **Sticker Badge:** "Create a small heart-shaped badge with a `#FF69B4` fill, white outline, and soft shadow. Add a tiny sparkle decoration."
6. **Ribbon Banner:** "Design a banner with ribbon-like ends, a pastel gradient fill, and rounded text. Soft shadow underneath."

### Iteration Guide
1. **Start Soft:** Begin with pastel colors and rounded shapes.
2. **Add Bubbles:** Introduce pill-shaped and bubble-shaped components.
3. **Decorate:** Add sticker elements (hearts, stars, flowers) to key components.
4. **Shadow Polish:** Apply soft, pastel-tinted shadows for depth.
5. **Frame It:** Add polaroid frames or tape corners to images for authenticity.
