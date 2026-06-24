# Pixel Art Design System

Retro 8-bit gaming aesthetic with visible pixel grid, limited palettes, and nostalgic CRT charm.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:**
- Nostalgic retro gaming charm
- Digital craftsmanship with deliberate constraints
- Playful yet technical
- Authentic 8-bit/16-bit era authenticity

**Emotional Description:**
The Pixel Art style transports users to the golden age of video gaming—when every pixel was placed with intention and limited color palettes sparked infinite imagination. It feels warm, nostalgic, and creatively constrained in the best way. The visible grid and blocky forms create a distinctive digital handmade quality.

**Key Characteristics:**
- Visible pixel grid with sharp, blocky edges
- Limited color count per sprite (4-16 colors typical)
- 8-bit or 16-bit visual fidelity
- Retro game UI elements (hearts, coins, score counters)
- Dithering patterns for gradient simulation
- Optional scanline or CRT overlay effects
- Pixel-perfect alignment (no anti-aliasing)
- Blocky, grid-aligned typography
- Sprite-based iconography

---

## 2. Color Palette & Roles

**Primary Colors (Classic NES Palette):**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| NES Red | Bright red | `#E40010` | Player characters, hearts, danger |
| NES Blue | Royal blue | `#0040C0` | Water, sky, player 2 |
| NES Green | Bright green | `#00A800` | Grass, health, collectibles |
| NES Yellow | Golden yellow | `#F8D800` | Coins, stars, highlights |

**Secondary Colors (Extended SNES):**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| SNES Orange | Warm orange | `#F88000` | Fire, lava, power-ups |
| SNES Purple | Rich purple | `#8000F0` | Magic, special items, portals |
| SNES Cyan | Bright cyan | `#00E8D8` | Ice, energy, shields |
| SNES Pink | Hot pink | `#F80080` | Rare items, special effects |

**Background Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Game Black | Deep black | `#000000` | Space, caves, default bg |
| Game Dark Blue | Navy | `#101038` | Night sky, deep water bg |
| Game Gray | Dark gray | `#404040` | Dungeon walls, metal |
| Game Brown | Earth brown | `#603000` | Dirt, wood, ground |

**UI Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| UI Background | Dark panel | `#202020` | Menu panels, HUD bg |
| UI Border | Light gray | `#C0C0C0` | Panel borders, outlines |
| UI Text | White | `#FFFFFF` | Primary UI text |
| UI Accent | Bright green | `#00FF00` | Selected items, cursors |
| UI Danger | Bright red | `#FF0000` | Warnings, low health |

**Neutral Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Black | Pure black | `#000000` | Outlines, shadows |
| Dark Gray | Charcoal | `#404040` | Secondary outlines |
| Medium Gray | Gray | `#808080` | Neutral elements |
| Light Gray | Silver | `#C0C0C0` | Highlights, borders |
| White | Pure white | `#FFFFFF` | Bright highlights, text |

---

## 3. Typography Rules

**Font Family:**
- Primary: Pixel/bitmap fonts (e.g., "Press Start 2P", "Pixelify Sans", "VT323")
- Secondary: Blocky monospace for code/technical text
- Numbers: Pixel display fonts for scores/stats

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Game Title | Pixel Display | 32-48px | 400 | 1.2 | 0em | Blocky, all caps, centered |
| Section Header | Pixel Font | 24px | 400 | 1.3 | 0em | All caps, pixel-perfect |
| Menu Item | Pixel Font | 16px | 400 | 1.5 | 0em | Left-aligned, selectable |
| Body Text | Pixel Font | 12-14px | 400 | 1.6 | 0em | Readable block size |
| Score/Stats | Pixel Display | 20-28px | 400 | 1.0 | 0.05em | Monospace numbers |
| Caption/Label | Pixel Font | 10-12px | 400 | 1.4 | 0em | Small UI labels |
| Button Text | Pixel Font | 14-16px | 400 | 1.0 | 0em | Centered in buttons |

**Typography Principles:**
- All text must align to the pixel grid (no sub-pixel positioning)
- Use bitmap/pixel fonts exclusively—never smooth vector fonts
- Text sizes should be multiples that align with the base pixel grid
- Score and numeric displays use monospace pixel fonts
- All caps preferred for headers and UI elements
- Line height should accommodate pixel font descenders

---

## 4. Component Stylings

### Buttons
- **Primary:** Solid color fill (NES red/blue/green), 2px black outline, white pixel text, no border-radius
- **Secondary:** Transparent fill, 2px colored outline, colored pixel text
- **Action:** Bright yellow fill with black text, pulsing animation optional
- **Disabled:** Dark gray fill, medium gray outline, gray text

### Cards & Containers
- **Game Panel:** Dark `#202020` fill, 2px `#C0C0C0` border, sharp corners, pixel corner decorations
- **Inventory Slot:** 32x32px or 64x64px square with 2px border, empty slots show checkerboard pattern
- **Dialog Box:** Full-width at bottom, dark semi-transparent bg, pixel border, text types out character by character

### Inputs & Forms
- **Text Input:** 2px border, dark bg, pixel cursor blinking, character-limited display
- **Slider:** Blocky pixel thumb on pixel track, stepped increments
- **Toggle:** Pixel switch with blocky thumb, snap animation

### Navigation
- **Menu:** Vertical list with pixel arrow cursor (`>` or `->`) indicating selection
- **Tab Bar:** Pixel tabs with 2px borders, active tab has brighter fill
- **Breadcrumb:** Pixel chevrons (`>`) between items

### Image Treatment
- All images rendered at pixel-perfect scale (1x, 2x, 3x—never fractional)
- Sprites on transparent or solid color backgrounds
- Dithering for smooth gradients (Bayer ordered dithering pattern)
- Optional scanline overlay (horizontal lines at 50% opacity)

### Distinctive Components
- **Health Bar:** Horizontal bar with heart icons, segmented into pixel blocks
- **Score Display:** Large pixel numbers with leading zeros
- **Pixel Sprite:** 16x16, 32x32, or 64x64 character/item artwork
- **Particle Effect:** 1-4px colored squares for explosions, sparkles
- **Pixel Cursor:** Custom 16x16 pixel art cursor (sword, hand, arrow)
- **CRT Frame:** Optional rounded-corner overlay with scanlines and vignette

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 4px (the pixel)
- Small gap: 4px (1 unit)
- Medium gap: 8px (2 units)
- Large gap: 16px (4 units)
- Section gap: 32px (8 units)
- All spacing must be multiples of 4px

**Grid & Container:**
- 8px or 16px base grid (pixel-aligned)
- Container max-width: 960px (divisible by 16)
- Layouts use blocky, grid-aligned sections
- Content organized in tile/slot patterns
- HUD elements positioned at screen edges

**Whitespace Philosophy:**
- Minimal whitespace—pixel art thrives on density
- Use patterned backgrounds (checkerboard, dots) instead of empty space
- Every pixel counts—no unnecessary padding
- Compact, information-dense layouts

**Border Radius Scale:**
- Sharp: 0px (default for everything)
- No rounded corners anywhere—pure pixel blocks

---

## 6. Depth & Elevation

**Elevation Table:**

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow, solid color | Background tiles, base layers |
| Raised | 2px offset shadow (black) | Buttons, interactive cards |
| Floating | 4px offset shadow + highlight | Modals, popups, important items |
| Layered | Multiple stacked pixel layers | Complex sprites, parallax bg |
| Glowing | Bright color + bloom effect | Power-ups, special items, selected |

**Shadow Philosophy:**
Shadows in pixel art are not blurred or gradient—they are solid blocks of darker color offset by 2-4 pixels. Use pure black or dark gray for shadows. Highlights are achieved with lighter colored pixels, not transparency. Depth comes from color choice and pixel placement, not soft shadows.

---

## 7. Do's and Don'ts

### Do's
- Use pixel-perfect alignment (no anti-aliasing)
- Limit color palette to 4-16 colors per sprite
- Use bitmap/pixel fonts exclusively
- Align everything to a 4px or 8px grid
- Include dithering for gradients
- Use blocky, stepped shapes
- Apply optional scanline or CRT effects
- Use solid color fills (no gradients)
- Design sprites at small sizes (16x16, 32x32)
- Use black outlines for readability

### Don'ts
- Don't use anti-aliased or smooth fonts
- Don't use border-radius or rounded corners
- Don't use CSS gradients or box-shadows
- Don't use transparency for shadows (use solid dark colors)
- Don't use photographic or vector images
- Don't use smooth animations (use stepped/frame-based)
- Don't use more than 16 colors in a single composition
- Don't use fractional pixel values
- Don't use blur effects
- Don't use smooth curves—everything should be stepped/blocky

---

## 8. Responsive Behavior

**Breakpoints:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | 1-column tile layout, 16x16 sprites, compact HUD |
| Tablet | 640-1024px | 2-column layout, 32x32 sprites, standard HUD |
| Desktop | > 1024px | Multi-column, 32x32 or 64x64 sprites, full HUD |

**Touch Targets:**
- Minimum 48x48px (12x12 pixel grid at 4x scale)
- Virtual D-pad: 120x120px minimum
- Action buttons: 64x64px minimum
- Menu items: 44px height minimum

**Collapsing Strategy:**
- Inventory grid reduces columns on smaller screens
- HUD elements reposition to bottom on mobile
- Menu becomes full-screen overlay on mobile
- Pixel art scales by integer multiples only (1x, 2x, 3x, 4x)

**Image Behavior:**
- Sprites must scale by nearest-neighbor (pixelated)
- Never use smooth/bilinear scaling
- Show at 1x, 2x, 3x, or 4x only
- Background patterns tile seamlessly

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#E40010` (red), `#0040C0` (blue), `#00A800` (green), `#F8D800` (yellow)
- Secondary: `#F88000` (orange), `#8000F0` (purple), `#00E8D8` (cyan), `#F80080` (pink)
- Backgrounds: `#000000` (black), `#101038` (dark blue), `#202020` (UI panel)
- UI: `#FFFFFF` (text), `#C0C0C0` (borders), `#00FF00` (accent)
- Always 0px border radius
- Always pixel-perfect, no anti-aliasing

### Example Component Prompts

1. **Pixel Art Hero:** "Create a hero section with a large 64x64 pixel art character sprite in the center. Use `#0040C0` blue for the character on a `#101038` dark blue background. Add pixel stars in `#F8D800` yellow. Title in Press Start 2P font, 32px, white. Include subtle scanline overlay."

2. **Pixel Score Board:** "Design a retro game score display with large pixel numbers showing '000450'. Use `#F8D800` yellow numbers with `#000000` black outline. Background is `#202020` dark panel with 2px `#C0C0C0` border. Add a small pixel coin icon in yellow."

3. **Pixel Menu Panel:** "Create a game menu panel with 4 options: START, OPTIONS, HELP, EXIT. Dark `#202020` background, 2px white border. Selected item highlighted in `#00A800` green with pixel arrow cursor `>` prefix. Press Start 2P font, 16px, white text."

4. **Pixel Health Bar:** "Design a health bar with 10 heart segments. Each heart is a 16x16 pixel sprite. Full hearts in `#E40010` red, empty hearts in `#404040` dark gray. Bar has 2px black outline. Place in top-left of a game HUD layout."

5. **Pixel Inventory Grid:** "Create a 4x4 inventory grid with 64x64px slots. Each slot has 2px `#C0C0C0` border and `#202020` background. Empty slots show a subtle checkerboard dither pattern. One slot contains a pixel sword sprite in `#C0C0C0` silver."

6. **Pixel Button Set:** "Create three pixel art buttons: PLAY (green `#00A800` fill), SETTINGS (blue `#0040C0` fill), QUIT (red `#E40010` fill). All buttons are rectangular with 2px black outline, 0px radius. White pixel text centered. 120x40px size."

7. **Pixel Notification Toast:** "Design a pixel art notification toast that slides in from top. Dark `#202020` background, 2px `#F8D800` yellow border. Contains a small pixel star icon and achievement text in white pixel font. 16px text size."

### Iteration Guide
1. Choose a limited color palette (4-8 colors for simple, up to 16 for complex)
2. Set base grid to 4px or 8px and align all elements
3. Use pixel/bitmap fonts at sizes divisible by 4
4. Design all shapes with blocky, stepped edges (0px radius)
5. Add 2px black outlines to interactive elements for readability
6. Apply solid color fills—no gradients, no transparency for shadows
7. Add dithering patterns where smooth gradients are needed
8. Optional: add scanline or CRT overlay for retro feel
9. Final check: verify no anti-aliasing, no rounded corners, all pixel-aligned
