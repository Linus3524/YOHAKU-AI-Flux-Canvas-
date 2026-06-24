# Retro Pop Grid Design System

1970s retro pop art with strict Swiss international grid, thick black outlines, and flat color blocks.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:**
- Bold, graphic, and unapologetically retro
- Design-conscious and culturally aware
- Structured yet playful
- Nostalgic with contemporary edge

**Emotional Description:**
The Retro Pop Grid style transports viewers to a 1970s design studio where Swiss precision meets underground comic rebellion. It feels like discovering a rare concert poster or an avant-garde magazine from the era — confident, saturated, and meticulously organized. The thick black outlines create a graphic punch that demands attention, while the grid structure provides reassuring order. It is bold without being chaotic, structured without being boring.

**Key Characteristics:**
- Uniform thick black outlines on all illustrations, text boxes, and grid dividers
- Pure 2D flat vector aesthetic with subtle screen print texture
- Strict Swiss international grid dividing canvas into square and rectangular cells
- Black-background cells with white text for warnings or key categories
- Geometric fill patterns in empty cells: checkerboards, diagonal lines, dots
- Flat abstract symbols, warning signs, keyholes, stars, arrows
- Vintage comic-style smiley/frowny faces for quality indicators
- Colored cells used for breathing room — some with minimal/no content

---

## 2. Color Palette & Roles

**Retro Accent Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Salmon Pink | Muted coral | `#FF8A80` | Warm accent cells, highlights |
| Sky Blue | Soft cyan | `#81D4FA` | Cool accent cells, calm contrast |
| Mustard Yellow | Golden ochre | `#FFD54F` | Energy accent cells, attention |
| Mint Green | Soft sage | `#A5D6A7` | Natural accent cells, balance |
| Muted Orange | Soft tangerine | `#FFAB91` | Secondary warm accent |
| Muted Lavender | Soft purple | `#CE93D8` | Secondary cool accent |

**Foundation Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Vintage Cream | Warm beige | `#F5F0E6` | Primary background |
| Pure Black | Black | `#000000` | Outlines, grid lines, inverted cells |
| Pure White | White | `#FFFFFF` | Text on black cells, breathing room |

**Pattern Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Checker Black | Black | `#000000` | Checkerboard pattern |
| Checker White | White | `#FFFFFF` | Checkerboard pattern |
| Diagonal Hatch | Black | `#000000` | 45-degree line hatching |
| Dot Pattern | Black | `#000000` | Regular dot grid |

---

## 3. Typography Rules

**Font Family:**
- Headers: Brutalist or retro thick display fonts (e.g., "Helvetica Now Display Black", "Arial Black", "Oswald", "Druk Wide")
- Body: Clean sans-serif (e.g., "Inter", "Helvetica Neue", "Roboto")
- Decorative: Bold sans-serif for stylistic labels

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Main Header | Display Sans | 48-80px | 900 | 1.0 | -0.02em | Brutalist, high impact |
| Subheader | Bold Sans | 24-32px | 700 | 1.2 | 0em | Clear hierarchy |
| Body Text | Clean Sans | 13-16px | 400/500 | 1.5 | 0em | Readable blocks |
| Decorative Label | Bold Sans | 14-18px | 700 | 1.2 | 0.05em | "WARNING", "INFO", "BEST" |
| Category Tag | Bold Sans | 11-13px | 700 | 1.0 | 0.08em | White on colored badge |
| Small Caption | Clean Sans | 10-11px | 400 | 1.3 | 0.01em | Fine print |

**Typography Principles:**
- Bold, high-impact display type for headers
- ALL CAPS for headers and decorative labels
- English words acceptable for stylistic labels regardless of content language
- Tight tracking on large headers; normal on body
- Decorative labels may use quotation marks or brackets for stylistic effect

---

## 4. Component Stylings

### Buttons
- **Primary:** Black fill, white text, sharp corners, thick border
- **Secondary:** Retro accent fill, black text, sharp corners, thick black border
- **Grid Button:** Square cell with centered icon/text, thick black border
- **Tab:** Rectangle with thick black border, accent fill when active

### Cards & Containers
- **Grid Cell:** Rectangle/square defined by thick black borders, retro accent or cream fill
- **Inverted Cell:** Black fill, white text, thick black border (merges with fill)
- **Pattern Cell:** Cream fill with checkerboard, diagonal lines, or dot pattern
- **Info Panel:** Multiple grid cells combined, thick borders throughout

### Inputs & Forms
- **Text Input:** Thick black border, cream fill, no rounded corners
- **Select:** Grid-cell style dropdown with thick borders
- **Checkbox:** Square with thick black border, checkmark in black

### Navigation
- **Grid Tabs:** Horizontal row of grid cells acting as tabs
- **Page Indicator:** Row of small squares, filled for active
- **Back/Forward:** Thick arrow icons in grid cells

### Image Treatment
- All visuals are flat 2D illustrations with thick black outlines
- No photographs or realistic images
- Icons and symbols reduced to geometric abstraction
- Vintage comic smiley/frowny faces for sentiment

### Distinctive Components
- **Grid Cell:** Rectangle or square with 3-4px solid black border, retro accent or cream fill
- **Inverted Contrast Cell:** Black fill with white bold text for warnings and key categories
- **Geometric Pattern Fill:** Checkerboard (8px squares), diagonal hatching (4px spacing), or dots (4px dots, 8px spacing)
- **Flat Symbol:** 2D geometric abstraction — warning signs, keyholes, stars, arrows — with 3px black outline
- **Vintage Comic Face:** Simple circle with dot eyes and curve mouth, thick black outline, 24-32px
- **Thick Outline Illustration:** Any subject reduced to flat color shapes with uniform 3px black outlines
- **Section Divider:** Thick black horizontal/vertical line, 3-4px
- **Category Badge:** Colored rectangle with white bold text and thick black border
- **Warning Sign:** Triangle with exclamation mark, thick black outline, yellow or black fill

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 8px
- Grid gap: 0px (cells touch at borders)
- Cell padding: 12-20px
- Section gap: Defined by grid rows
- Page margin: 16-24px

**Grid & Container:**
- Strict Swiss-style grid: canvas divided into equal square and rectangular cells
- Thick black lines (3-4px) form all grid divisions
- Every element anchored to a grid cell — no floating elements
- Cell sizes uniform within rows/columns; rows/columns may vary in proportion
- Maximum content width: 1200px for poster-like impact

**Whitespace Philosophy:**
- White space achieved through empty cream or white cells, not by breaking grid
- Some cells intentionally sparse or empty for rhythmic contrast
- Dense and sparse cells balanced throughout composition
- No element exists outside the grid structure

**Border Radius Scale:**
- Sharp: 0px (for all elements — grid aesthetic)
- None: Everything is angular and geometric

---

## 6. Depth & Elevation

**Elevation Table:**

| Level | Treatment | Use |
|-------|-----------|-----|
| Background Cream | Flat | Canvas base |
| Grid Lines | Flat, 3-4px black | Structural divisions |
| Cell Fills | Flat, solid color | Content containers |
| Cell Content | Flat, on top | Text, symbols, illustrations |
| Overlays | Flat, opaque | Modal panels if needed |

**Shadow Philosophy:**
Absolutely no gradients, shading, drop shadows, or 3D effects. The Retro Pop Grid is strictly 2D. Depth is implied only through:
- Color contrast between adjacent cells
- Inverted black cells creating visual punch
- Pattern fills adding texture without depth
- Thick outlines defining every boundary

---

## 7. Do's and Don'ts

### Do's
- Use thick black outlines on every element
- Anchor every element to a grid cell
- Use the muted retro palette consistently
- Include geometric pattern fills in sparse cells
- Use inverted black cells for maximum contrast callouts
- Maintain 1970s retro pop art and underground comic feel
- Balance dense and sparse cells for rhythmic visual flow
- Use ALL CAPS for headers and decorative labels
- Keep everything flat and 2D
- Use vintage comic smiley faces for quality indicators

### Don'ts
- Don't use gradients, realistic details, or soft shadows
- Don't use thin, sketch-like, or pencil lines
- Don't allow free-floating or unorganized elements
- Don't use pure white as canvas background — use vintage cream
- Don't introduce organic or hand-drawn imperfections
- Don't break the grid system
- Don't use 3D rendering or perspective
- Don't use rounded corners on any element
- Don't use soft pastels or neon colors
- Don't forget the thick black outlines

---

## 8. Responsive Behavior

**Breakpoints:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column vertical stack, grid implicit through borders, inverted cells remain impactful |
| Tablet | 640-1024px | Grid reflows to 3-4 columns, cells scale, outlines 2-3px |
| Desktop | > 1024px | Full grid visible, 4-6 columns, all cells and decorations present |

**Touch Targets:**
- Grid cells: 44x44px minimum
- Interactive symbols: 40x40px minimum
- Navigation tabs: 48px height minimum

**Collapsing Strategy:**
- Grid reflows to fewer columns on smaller screens
- Large cells may span full width on mobile
- Pattern fills simplify on very small screens
- Inverted contrast cells remain prominent

**Image Behavior:**
- Flat illustrations scale cleanly
- Thick outlines maintained at 2-3px minimum on mobile
- Grid lines remain visible at all sizes
- Pattern fills may reduce in density on small screens

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#F5F0E6` (vintage cream)
- Accents: `#FF8A80` (salmon), `#81D4FA` (sky blue), `#FFD54F` (mustard), `#A5D6A7` (mint), `#FFAB91` (orange), `#CE93D8` (lavender)
- Contrast: `#000000` (black), `#FFFFFF` (white)
- Outlines: 3-4px solid black on everything
- Patterns: checkerboard, diagonal lines, dots in black

### Example Component Prompts

1. **Grid Cell Info Card:** "Create a Retro Pop Grid style info card. Vintage cream `#F5F0E6` background. Thick 4px black border. Mint green `#A5D6A7` fill. White text (if inverted) or black text. Sharp corners, no radius. Part of a larger grid layout. Bold sans-serif typography."

2. **Inverted Warning Cell:** "Design an inverted contrast grid cell. Black `#000000` fill. White bold text 'WARNING' in 18px brutalist sans. Thick 4px black border (merges with fill, defined by adjacent cells). Sharp corners. Retro pop grid aesthetic."

3. **Pattern Fill Cell:** "Create a grid cell with geometric pattern fill. Vintage cream background with checkerboard pattern: 8px squares alternating black `#000000` and white `#FFFFFF`. Thick 4px black border. No content inside — used as breathing room. 1970s retro style."

4. **Product Comparison Grid:** "Design a 3x3 product comparison grid in Retro Pop Grid style. Vintage cream background. Each cell: thick 4px black border, retro accent fill (salmon, sky blue, mustard). Product name in bold sans-serif. Price in large display font. Vintage comic smiley face for rating. Inverted black cell for 'BEST' pick."

5. **Category Badge:** "Create a retro pop category badge. Rectangle with thick 3px black border. Mustard yellow `#FFD54F` fill. White bold text 'NEW' in 12px sans-serif with letter spacing. Sharp corners. Flat 2D style."

6. **Vintage Comic Face:** "Design a vintage comic-style quality indicator face. Simple circle with thick 3px black outline. Dot eyes. Upturned curve mouth for happy. Flat fill — no gradients. 28px diameter. Retro 1970s comic aesthetic."

7. **Retro Pop Grid Poster:** "Create a full Retro Pop Grid poster layout. Vintage cream `#F5F0E6` background. Strict Swiss grid divided by thick 4px black lines into square and rectangular cells. Mix of content cells (salmon, sky blue, mustard, mint fills with bold text) and pattern cells (checkerboard, diagonal lines, dots). Inverted black cells with white text for warnings and key categories. Bold brutalist headers. Vintage comic smiley faces. Flat 2D only — no gradients, no shadows, no 3D. 1970s retro pop art feel."

### Iteration Guide
1. Define the grid structure (columns and rows)
2. Assign content to cells
3. Choose retro accent colors for content cells
4. Leave some cells empty with pattern fills for rhythm
5. Identify key cells for inverted black treatment
6. Add thick black outlines to all cells and elements
7. Place bold typography in content cells
8. Add vintage comic faces for sentiment indicators
9. Add geometric symbols and flat illustrations
10. Final check: all elements grid-anchored, thick outlines, flat 2D, retro palette
