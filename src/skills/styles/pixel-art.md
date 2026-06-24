# Pixel Art Design System

Retro 8-bit pixel art aesthetic with nostalgic gaming visual style.

---

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Playful, nostalgic, fun, and immediately recognizable
- **Emotional Description:** Pixelated retro aesthetic reminiscent of classic 8-bit and 16-bit era games
- **Key Characteristics:**
  - Chunky pixels, limited color palettes
  - Simple geometric shapes rendered in blocky pixel form
  - Nostalgic gaming references and retro tech aesthetic
  - Fun, playful, and approachable
  - Limited anti-aliasing to maintain retro feel
  - Dithering patterns for gradients and shadows

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Light Blue | #87CEEB | Primary background |
| **Secondary** | Soft Lavender | #E6E6FA | Secondary backgrounds |
| **Primary Text** | Dark Navy | #1A1A2E | Headlines, body text |
| **Accent 1** | Pixel Green | #00FF00 | Success, highlights, health |
| **Accent 2** | Pixel Red | #FF0000 | Alerts, emphasis, damage |
| **Accent 3** | Pixel Yellow | #FFFF00 | Warnings, energy, coins |
| **Accent 4** | Pixel Cyan | #00FFFF | Info, tech elements, mana |
| **Accent 5** | Pixel Magenta | #FF00FF | Special elements, power-ups |
| **Surface** | Dark Gray | #2D2D2D | UI panels, containers |
| **Neutral** | Medium Gray | #808080 | Borders, inactive elements |

**Color Philosophy:** Limited to 16-32 color palette per slide. Pure, saturated primary/secondary colors typical of 8-bit displays. No gradients — use dithering for color transitions. Each color has a semantic meaning drawn from gaming conventions.

---

## 3. Typography Rules

**Font Family:**
- **Headlines:** Pixelated bitmap font (Press Start 2P, Pixelify Sans)
- **Body:** Smaller pixel font with consistent 8x8 or 16x16 character grid

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Title | Bitmap Pixel | 32-48px | 400 | 1.2 | 0 | All-caps, chunky blocky letterforms |
| Headline | Bitmap Pixel | 24-32px | 400 | 1.2 | 0 | All-caps for maximum readability |
| Body | Bitmap Pixel | 16px | 400 | 1.4 | 0 | 8x8 or 16x16 character grid |
| Caption | Bitmap Pixel | 12px | 400 | 1.2 | 0 | Smallest readable pixel size |
| UI Label | Bitmap Pixel | 14px | 400 | 1.2 | 0 | Menu items, buttons |
| Score/Stat | Bitmap Pixel | 20-28px | 400 | 1.0 | 0 | Numbers, metrics, counters |

**Principles:**
- Render as actual pixel art, not smooth vectors
- All-caps for maximum readability
- Limited anti-aliasing to maintain retro feel
- High contrast against background
- Consistent pixel grid alignment

---

## 4. Component Stylings

### Buttons
- **Primary:** Solid Pixel Green (#00FF00) or Pixel Cyan (#00FFFF), black text, 0px border-radius (blocky), pixel border
- **Secondary:** Dark Gray (#2D2D2D) background, white text, pixel outline border
- **Action:** Pixel Yellow (#FFFF00) background, black text, with arrow decoration

### Cards & Containers
- Dark Gray (#2D2D2D) or black background
- Pixel-thick borders (2-4px) in accent colors
- 0px border-radius (sharp pixel corners)
- Padding in multiples of 8px (pixel grid)

### Inputs & Forms
- Black background
- Pixel-thick border in Pixel Cyan (#00FFFF)
- 0px border-radius
- Blinking cursor (pixel block)
- Labels: pixel font, accent color

### Navigation
- Pixel-style menu bar
- Bitmap pixel font for all nav items
- Active: highlighted background block in accent color
- Selection indicator: arrow or bracket characters

### Image Treatment
- All elements rendered with visible pixel structure
- Simple iconography: notepad, checkboxes, gears, rockets, play buttons
- Dithering patterns for gradients and shadows
- Blocky, geometric shapes only

### Distinctive Components
- **Health Bar:** Pixel Green segments, chunky blocks, heart icons
- **Progress Bar:** Chunky pixel segments, accent color fill
- **Text Bubble:** Rectangular with pixel border, speech tail
- **Inventory Grid:** Equal-sized pixel cells with item icons
- **Score Counter:** Large pixel numbers with accent color
- **Pixel Icon:** 16x16 or 32x32 pixel art icons

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 8px (pixel grid alignment)
- Section padding: 32-48px vertical (multiples of 8)
- Content aligned to pixel grid
- Tight, game-UI-like spacing

**Grid & Container:**
- Pixel-aligned grid (multiples of 8px)
- Blocky, rectangular regions
- Symmetrical layouts typical of game UIs
- Inventory-style grids for content organization

**Whitespace Philosophy:**
- Minimal whitespace — dense like a game interface
- Clear separation through borders and color blocks
- Every pixel counts — no wasted space

**Border Radius Scale:**
- Default: 0px (sharp pixel corners everywhere)
- Exception: None — maintain blocky aesthetic throughout

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat, solid color | Base elements, backgrounds |
| 1 | Pixel border | Buttons, cards, containers |
| 2 | Highlight border | Active/selected elements |
| 3 | Color block shift | Elevated UI panels |
| 4 | Dithered shadow | Floating elements (rare) |

**Shadow Philosophy:** No traditional shadows. Create depth through:
- Pixel-thick borders
- Color shifts (darker shade below)
- Dithering patterns for pseudo-gradients
- Highlight borders for active states

---

## 7. Do's and Don'ts

### Do
- Maintain consistent pixel grid throughout
- Use limited color palette (16-32 colors max)
- Create blocky, geometric shapes
- Add nostalgic gaming references where appropriate
- Use dithering for color transitions
- Render typography as actual pixel art
- Align everything to the pixel grid

### Don't
- Use smooth gradients or anti-aliasing
- Create photorealistic elements
- Use thin lines or fine details
- Add modern glossy effects
- Add slide numbers, footers, or logos
- Use rounded corners or curves
- Break the pixel grid alignment

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, pixel font 12-16px, simplified icons |
| Tablet | 640-1024px | 2-column grid, pixel font 16px, full icons |
| Desktop | > 1024px | Multi-column layout, pixel font 16-24px, full detail |

**Touch Targets:** Minimum 48px (6 pixels at 8px base) for interactive elements

**Collapsing Strategy:**
- Grid layouts collapse maintaining pixel alignment
- Side-by-side elements stack vertically
- Icons may simplify to smaller pixel grids
- Text bubbles remain full-width

**Image Behavior:**
- Pixel art icons scale by integer multiples only (2x, 3x, 4x)
- Never scale by non-integer amounts (prevents blur)
- Dithering patterns maintain at all scales
- Background pixel grid pattern tiles seamlessly

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: #87CEEB (Light Blue) / #E6E6FA (Soft Lavender)
- Primary Text: #1A1A2E (Dark Navy)
- Accent: #00FF00 (Pixel Green), #FF0000 (Pixel Red), #FFFF00 (Pixel Yellow)
- UI: #2D2D2D (Dark Gray), #808080 (Medium Gray)

### Example Component Prompts

1. **Game UI Panel:** "Dark Gray (#2D2D2D) rectangular panel with 4px Pixel Cyan (#00FFFF) border. Title in pixel font (24px, all-caps). Content area below with pixel-thin divider lines. 0px border-radius throughout."

2. **Health/Stats Display:** "Row of pixel hearts (Pixel Red #FF0000) followed by a health bar with chunky green (#00FF00) segments. Score counter in large pixel font (28px, Pixel Yellow #FFFF00). All elements aligned to 8px grid."

3. **Inventory Grid:** "8x4 grid of 48x48px cells with 2px borders. Each cell contains a 32x32 pixel art icon. Selected cell has Pixel Yellow (#FFFF00) highlight border. Dark background."

4. **Pixel Speech Bubble:** "Rectangular text bubble with 2px black border and white fill. Small pixel tail pointing down. Text inside in pixel font (16px, black). 0px border-radius."

5. **Progress Bar:** "Horizontal bar with Dark Gray (#2D2D2D) background and Pixel Green (#00FF00) fill. Chunky segments, not smooth. Percentage label in pixel font (14px) at the end."

6. **Retro Menu:** "Vertical list of menu items in pixel font (18px). Each item has a small pixel arrow (►) on left when selected. Selected item has inverted colors (white text on accent background). Black background."

### Iteration Guide

1. **Set the grid:** Establish an 8px base grid and align everything to it.
2. **Limit colors:** Choose 16-32 colors max and stick to them.
3. **Blocky shapes:** Reduce all shapes to simple geometric blocks.
4. **Pixel typography:** Use bitmap fonts, never smooth vector fonts.
5. **Add dithering:** Use checkerboard dithering for any color transitions.
6. **Gaming references:** Add hearts, coins, stars, and other retro gaming icons.
