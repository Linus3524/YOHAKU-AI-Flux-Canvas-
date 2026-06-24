# XHS Fresh Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Clean, refreshing, natural, and minimalist. A Xiaohongshu aesthetic that conveys purity, wellness, and simplicity.
- **Emotional Description:** Calm, breathable, rejuvenating, and serene. It feels like a morning walk in a garden or a deep breath of fresh air.
- **Key Characteristics:**
  - Clean, open compositions with generous breathing room.
  - Mint green, sky blue, and light yellow color dominance.
  - Natural, organic visual elements (leaves, clouds, water drops).
  - Simple geometric shapes with soft edges.
  - Light, airy hand lettering with breathing room.
  - Clear-glow or cool-tone image filters.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Mint** | `#9AE6B4` | Main accents, primary buttons, fresh highlights |
| **Primary Sky** | `#90CDF4` | Info elements, cool accents, sky-themed sections |
| **Primary Yellow** | `#FAF089` | Warm highlights, stars, subtle energy |
| **Secondary Leaf** | `#48BB78` | Success states, nature elements, deep green accents |
| **Secondary Water** | `#4299E1` | Links, interactive elements, water-themed accents |
| **Interactive Teal** | `#38B2AC` | Hover states, focus rings, active elements |
| **Neutral 900** | `#1A202C` | Primary text |
| **Neutral 700** | `#4A5568` | Secondary text |
| **Neutral 400** | `#A0AEC0` | Placeholder text, subtle borders |
| **Neutral 200** | `#E2E8F0` | Dividers, light borders |
| **Surface White** | `#FFFFFF` | Main page background, pure canvas |
| **Surface Soft Mint** | `#F0FFF4` | Card backgrounds, panels, fresh sections |
| **Surface Cream** | `#FFFAF0` | Warm sections, organic backgrounds |
| **Semantic Success** | `#48BB78` | Success states, positive feedback |
| **Semantic Warning** | `#ECC94B` | Warnings, pending states |
| **Semantic Error** | `#F56565` | Errors, destructive actions |
| **Semantic Info** | `#4299E1` | Informational callouts |

## 3. Typography Rules

- **Font Family:** A clean, light sans-serif (e.g., Inter, Open Sans, or Lato) with generous spacing. Airy and unobtrusive.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Light Sans | 48px / 3rem | 300 | 1.15 | 0.02em | Airy, light, breathing room |
| H1 | Light Sans | 36px / 2.25rem | 400 | 1.2 | 0.01em | Clean, minimal |
| H2 | Sans-serif | 26px / 1.625rem | 500 | 1.3 | 0.005em | Sub-section headers |
| H3 | Sans-serif | 20px / 1.25rem | 500 | 1.4 | 0 | Card titles |
| Body | Sans-serif | 16px / 1rem | 400 | 1.7 | 0.01em | Main readable text, generous line height |
| Body Small | Sans-serif | 14px / 0.875rem | 400 | 1.6 | 0.02em | Captions, metadata |
| Label | Sans-serif | 12px / 0.75rem | 600 | 1.4 | 0.08em | Uppercase, badges, tags |
| Button | Sans-serif | 16px / 1rem | 600 | 1 | 0.01em | Clean and actionable |

- **Principles:** Typography should feel light and unobtrusive. Use generous line height and letter spacing. Avoid heavy, bold weights except for small labels.

## 4. Component Stylings

### Buttons
- **Primary:** Flat Primary Mint `#9AE6B4` fill, dark text, 8px border-radius, no shadow or very subtle shadow.
- **Secondary:** Flat Primary Sky `#90CDF4` fill, dark text, 8px border-radius.
- **Ghost:** Transparent background, 1px solid Primary Mint `#9AE6B4` border, mint text, 8px border-radius.
- **Text Button:** No background, no border, Secondary Water `#4299E1` text, underline on hover.

### Cards & Containers
- **Card:** White `#FFFFFF` or Surface Soft Mint `#F0FFF4` background, 1px solid Neutral 200 border, 12px border-radius, very subtle shadow.
- **Panel:** Surface Soft Mint `#F0FFF4` background, no border, 12px border-radius.
- **Clean Frame:** White background, 1px solid Neutral 200 border, 8px border-radius, minimal shadow.

### Inputs & Forms
- **Text Input:** White `#FFFFFF` background, 1px solid Neutral 300 border, 8px border-radius, no inner shadow.
- **Focus State:** Border changes to Primary Mint `#9AE6B4`, subtle glow.
- **Checkbox/Radio:** Rounded, 1px border, mint fill when checked.

### Navigation
- **Nav Bar:** White `#FFFFFF` background, 1px bottom border in Neutral 200, minimal shadow.
- **Nav Item:** Clean sans text in Neutral 700, hover turns Leaf Green `#48BB78`.
- **Active Nav Item:** Mint `#9AE6B4` text or a small mint underline.

### Image Treatment
- Images should have rounded corners (8px-12px).
- Optional white or soft mint border.
- Clear-glow or cool-tone filter aesthetic.
- Natural imagery preferred (plants, sky, water).

### Distinctive Components
- **Leaf Decoration:** Small leaf icon or illustration as a decorative accent.
- **Cloud Tag:** A soft, cloud-shaped tag with mint or sky background.
- **Water Drop Icon:** Small water drop shapes used as bullet points or accents.
- **Checkmark Circle:** A circle with a checkmark for positive affirmation.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px, 3xl: 64px.
- **Grid & Container:**
  - Max container width: 1200px.
  - 12-column grid with 32px gutters (generous spacing).
  - Clean, organized layouts with clear hierarchy.
- **Whitespace Philosophy:** Generous and breathable. Whitespace is essential to the fresh aesthetic. Elements should have plenty of room to breathe, creating a sense of calm and clarity.
- **Border Radius Scale:**
  - Small: 4px (small tags)
  - Medium: 8px (buttons, inputs)
  - Large: 12px (cards, panels)
  - XL: 16px (modals, large containers)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat | Base layer |
| 1 | `box-shadow: 0 1px 3px rgba(0,0,0,0.05)` | Resting cards |
| 2 | `box-shadow: 0 2px 8px rgba(0,0,0,0.06)` | Hover cards, dropdowns |
| 3 | `box-shadow: 0 4px 16px rgba(0,0,0,0.08)` | Modals, popovers |

- **Shadow Philosophy:** Extremely subtle, almost imperceptible shadows. The fresh aesthetic relies on whitespace and clean borders rather than shadow depth. Shadows should be very light and diffuse.

## 7. Do's and Don'ts

- **DO:**
  - Use generous whitespace and breathing room.
  - Apply clean, minimal borders.
  - Use mint, sky blue, and light yellow as primary colors.
  - Include natural, organic decorative elements.
  - Keep layouts clean and uncluttered.
  - Use light, airy typography.
- **DON'T:**
  - Use dark, heavy colors or backgrounds.
  - Apply strong shadows or depth effects.
  - Create dense, cluttered layouts.
  - Use overly decorative or playful fonts.
  - Apply heavy outlines or borders.
  - Use neon or overly saturated colors.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, panels stack, nav collapses to hamburger |
| Tablet | 640px - 1024px | 2-column grid, side panels become overlays |
| Desktop | > 1024px | Full multi-column grid, clean organized layouts |

- **Touch Targets:** Minimum 44x44px for all interactive elements.
- **Collapsing Strategy:** Clean cards stack vertically. Navigation collapses into a minimal hamburger menu.
- **Image Behavior:** Images maintain aspect ratio, rounded corners persist. Natural imagery should remain clear and bright.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#9AE6B4` (Mint), `#90CDF4` (Sky), `#FAF089` (Yellow)
- Secondary: `#48BB78` (Leaf), `#4299E1` (Water)
- Background: `#FFFFFF` (White), `#F0FFF4` (Soft Mint)
- Text: `#1A202C` (Primary), `#4A5568` (Secondary)

### Example Component Prompts

1. **Fresh Primary Button:** "Create a button with a flat mint `#9AE6B4` fill, dark text, 8px border-radius, and no shadow. Hover state should slightly darken the mint color."
2. **Clean Card:** "Design a card with a white `#FFFFFF` background, a 1px solid `#E2E8F0` border, 12px border-radius, and minimal shadow. Add a small leaf decoration in the corner."
3. **Cloud Tag:** "Create a tag component with a soft mint `#F0FFF4` background, rounded-full shape, and clean sans text. No border, minimal shadow."
4. **Fresh Input Field:** "Design a text input with a white background, a 1px solid `#CBD5E0` border, 8px border-radius, and no inner shadow. Focus state should add a mint `#9AE6B4` border and subtle glow."
5. **Nature Banner:** "Create a banner with a gradient from soft mint `#F0FFF4` to white, a small leaf illustration, and clean sans text. No heavy borders."
6. **Checkmark Item:** "Design a list item with a small circle containing a mint `#48BB78` checkmark, clean text, and generous spacing between items."

### Iteration Guide
1. **Start Clean:** Begin with a white background and minimal elements.
2. **Add Mint:** Introduce mint and sky blue accents sparingly.
3. **Whitespace Audit:** Ensure generous spacing between all elements. Increase padding and margins.
4. **Natural Touch:** Add small organic decorations (leaves, clouds, water drops).
5. **Shadow Minimize:** Keep shadows extremely subtle or remove them entirely. Rely on whitespace for separation.
