# Ink Brush Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Artistic, contemplative, bold, and rooted in tradition. Inspired by traditional Chinese ink brush painting (shuimo), conveying dynamism and cultural depth.
- **Emotional Description:** Powerful, serene, dramatic, and timeless. It feels like a masterful scroll painting brought to life.
- **Key Characteristics:**
  - Dynamic, pressure-sensitive brush strokes with varying weight.
  - Ink wash effects and atmospheric gradients.
  - High contrast compositions with dramatic negative space.
  - Flowing movement in lines and forms.
  - Traditional East Asian aesthetic elements.
  - Bold confidence combined with ethereal subtlety.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Ink** | `#1A1A1A` | Primary text, strong outlines, brush strokes |
| **Primary Crimson** | `#8B0000` | Primary accents, seals, important highlights |
| **Primary Gold** | `#D4AF37` | Imperial accents, premium elements, decorative details |
| **Secondary Ink Wash** | `#2D3748` | Secondary text, softer outlines, wash effects |
| **Interactive Blue** | `#4A5568` | Links, subtle interactive states |
| **Neutral 900** | `#1A202C` | Deep text, strong contrasts |
| **Neutral 700** | `#4A5568` | Secondary text |
| **Neutral 500** | `#718096` | Muted text, placeholder |
| **Neutral 400** | `#9CA3AF` | Subtle borders, misty dividers |
| **Neutral 200** | `#E2E8F0` | Light dividers |
| **Surface Rice Paper** | `#FAF3E8` | Main page background, scroll paper feel |
| **Surface Mist** | `#9CA3AF` | Atmospheric sections, misty overlays |
| **Surface Earth** | `#8B7355` | Earthy panels, natural containers |
| **Semantic Success** | `#2F855A` | Success states (deep green ink) |
| **Semantic Warning** | `#B7791F` | Warnings (amber ink) |
| **Semantic Error** | `#9B2C2C` | Errors (crimson ink) |
| **Semantic Info** | `#2C5282` | Informational callouts (indigo ink) |

## 3. Typography Rules

- **Font Family:** A calligraphic or brush-stroke inspired font (e.g., Ma Shan Zheng, ZCOOL XiaoWei, or Noto Serif SC) for headers. A clean serif (e.g., Noto Serif, Source Han Serif) for body text to maintain the traditional feel.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Calligraphic | 56px / 3.5rem | 400 | 1.3 | 0.1em | Brush-stroke feel, artistic spacing |
| H1 | Calligraphic | 40px / 2.5rem | 400 | 1.35 | 0.08em | Section titles, seal-like presence |
| H2 | Serif | 28px / 1.75rem | 600 | 1.4 | 0.02em | Sub-section headers |
| H3 | Serif | 22px / 1.375rem | 600 | 1.5 | 0.01em | Card titles |
| Body | Serif | 16px / 1rem | 400 | 1.8 | 0.02em | Main readable text, generous spacing |
| Body Small | Serif | 14px / 0.875rem | 400 | 1.6 | 0.03em | Captions, metadata |
| Label | Sans-serif | 12px / 0.75rem | 500 | 1.4 | 0.1em | Uppercase, badges, minimal use |
| Button | Serif | 16px / 1rem | 600 | 1 | 0.05em | Bold and deliberate |
| Seal Text | Calligraphic | 14px / 0.875rem | 400 | 1 | 0.15em | Red seal stamp text |

- **Principles:** Embrace the irregular beauty of brush strokes. Use generous letter spacing for headers to mimic the deliberate pacing of calligraphy. Body text should remain readable despite the traditional aesthetic.

## 4. Component Stylings

### Buttons
- **Primary:** Rice paper `#FAF3E8` background, 2px solid Ink `#1A1A1A` border with brush-stroke texture, 4px border-radius, ink text.
- **Secondary:** Transparent background, 1px solid Ink Wash `#2D3748` border, ink text.
- **Accent:** Crimson `#8B0000` fill (like a seal stamp), Gold `#D4AF37` text, square or slightly rounded corners.
- **Ghost:** Transparent, ink text only, underline on hover like a brush stroke.

### Cards & Containers
- **Card:** Rice paper `#FAF3E8` background, 1px solid Neutral 400 border with subtle ink wash texture, 4px border-radius.
- **Panel:** Transparent background, 2px solid Ink `#1A1A1A` top and bottom borders only (scroll-like).
- **Seal Badge:** Small square or circle, Crimson `#8B0000` fill, Gold `#D4AF37` text, like a traditional seal stamp.

### Inputs & Forms
- **Text Input:** Rice paper background, 1px solid Neutral 400 border, 4px border-radius, no inner shadow.
- **Focus State:** Border changes to Ink `#1A1A1A`, subtle ink wash glow.
- **Checkbox/Radio:** Square shape, 1px ink border, ink fill when checked.

### Navigation
- **Nav Bar:** Transparent or Rice Paper `#FAF3E8` background, 1px bottom border in Ink Wash `#2D3748`.
- **Nav Item:** Serif text in Ink `#1A1A1A`, hover adds a brush-stroke underline.
- **Active Nav Item:** Bold ink text with a Crimson `#8B0000` dot or underline accent.

### Image Treatment
- Images can have irregular, brush-stroke inspired borders.
- Optional ink wash overlay for atmospheric effect.
- High contrast, dramatic compositions preferred.
- Negative space used as a design element around images.

### Distinctive Components
- **Seal Stamp:** Small red square badge with gold text, used for authentication or emphasis.
- **Ink Wash Divider:** A horizontal line with fading ink wash edges instead of a solid line.
- **Scroll Container:** Vertical container with decorative top and bottom borders, rice paper background.
- **Brush Stroke Accent:** Decorative brush stroke elements used as underlines or background decorations.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px, 3xl: 64px.
- **Grid & Container:**
  - Max container width: 1100px (narrower for a scroll-like feel).
  - 12-column grid with 32px gutters.
  - Asymmetric layouts that echo the flow of brush strokes.
- **Whitespace Philosophy:** Dramatic and intentional. Negative space is a core design element, used to create balance, focus, and atmospheric depth. Avoid cluttering the canvas.
- **Border Radius Scale:**
  - None: 0px (for scroll panels, seal stamps)
  - Small: 4px (for cards, buttons)
  - Medium: 8px (for modals, larger containers)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat, no shadow | Base layer, scroll panels |
| 1 | Subtle ink wash gradient overlay | Hover on cards |
| 2 | Slight offset with ink wash shadow | Dropdowns, floating elements |
| 3 | Layered ink wash depth | Modals, emphasis panels |

- **Shadow Philosophy:** Depth is achieved through ink wash gradients and layering rather than modern drop shadows. Shadows should feel like natural ink diffusion — soft, organic, and atmospheric. Avoid sharp, digital-looking shadows.

## 7. Do's and Don'ts

- **DO:**
  - Use dynamic, varying line weights that mimic brush pressure.
  - Embrace negative space as a design element.
  - Apply ink wash gradients for atmosphere and depth.
  - Use traditional colors (ink black, crimson red, imperial gold).
  - Include calligraphic or brush-stroke inspired typography.
  - Create high contrast compositions.
- **DON'T:**
  - Use perfect geometric shapes or sharp digital lines.
  - Apply modern drop shadows or glassmorphism effects.
  - Use bright, neon, or overly saturated colors.
  - Create dense, cluttered layouts.
  - Use rounded, bubbly, or cartoonish shapes.
  - Apply gradient fills that look digital rather than ink-wash.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, panels stack vertically, nav collapses to a simple menu |
| Tablet | 640px - 1024px | 2-column grid, side panels become overlays |
| Desktop | > 1024px | Full multi-column grid, asymmetric flowing layouts |

- **Touch Targets:** Minimum 44x44px for all interactive elements.
- **Collapsing Strategy:** Scroll-like panels stack vertically. Navigation simplifies to a clean, minimal menu.
- **Image Behavior:** Images maintain aspect ratio, irregular borders scale down. Ink wash overlays should remain subtle at all sizes.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#1A1A1A` (Ink), `#8B0000` (Crimson), `#D4AF37` (Gold)
- Background: `#FAF3E8` (Rice Paper), `#9CA3AF` (Mist), `#8B7355` (Earth)
- Text: `#1A1A1A` (Ink), `#4A5568` (Ink Wash)
- Accents: `#8B0000` (Seal Red), `#D4AF37` (Imperial Gold)

### Example Component Prompts

1. **Ink Brush Button:** "Create a button with a rice paper `#FAF3E8` background, a 2px solid ink `#1A1A1A` border with a subtle brush-stroke texture, 4px border-radius, and ink-colored serif text. Hover state should add a slight ink wash overlay."
2. **Seal Stamp Badge:** "Design a small square badge like a traditional Chinese seal stamp. Crimson `#8B0000` background, Gold `#D4AF37` calligraphic text, 0px border-radius, slight texture."
3. **Scroll Panel:** "Create a content panel with a rice paper `#FAF3E8` background, decorative 2px ink borders on the top and bottom only (like a scroll), and generous internal padding. No side borders."
4. **Ink Wash Card:** "Design a card with a rice paper background, a 1px border with ink wash texture, 4px border-radius, and a subtle ink wash gradient in the corner for atmosphere."
5. **Calligraphic Header:** "Create a page header with a calligraphic font, Ink `#1A1A1A` color, generous letter spacing (0.1em), and a decorative brush-stroke underline in Crimson `#8B0000`."
6. **Mist Divider:** "Design a horizontal divider that fades at both ends like ink dissolving in water. Use Ink Wash `#2D3748` color, 1px height, with a gradient opacity from 0% to 100% to 0%."

### Iteration Guide
1. **Start Traditional:** Begin with the rice paper background, ink colors, and calligraphic typography.
2. **Add Brush Dynamics:** Introduce varying line weights and brush-stroke textures to borders and decorations.
3. **Ink Wash Layer:** Add ink wash gradients for depth and atmosphere. Keep them subtle and organic.
4. **Negative Space:** Audit the layout for clutter. Increase whitespace and let negative space breathe.
5. **Seal Accents:** Add small seal stamp accents or crimson highlights to key elements for cultural authenticity.
