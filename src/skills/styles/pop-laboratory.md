# Pop Laboratory Design System

Lab manual precision meets pop art color impact — coordinate systems, technical diagrams, and fluorescent accents on blueprint grid.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:**
- Analytically rigorous yet visually explosive
- Postmodern and self-aware
- Precise, measured, and systematic
- Boldly unconventional in color usage

**Emotional Description:**
The Pop Laboratory style creates a unique tension between the cold precision of scientific documentation and the hot energy of pop art. It feels like discovering a secret lab where engineers communicate through neon markers on blueprint paper. The viewer is simultaneously impressed by the technical density and arrested by the fluorescent color punches. It is intellectual, edgy, and deliberately overwhelming.

**Key Characteristics:**
- Coordinate-style labels on every module (R-20, G-02, SEC-08)
- Technical diagrams: exploded views, cross-sections, anchor points
- Vertical/horizontal rulers with precise markers (0.5mm, 1.8mm, 45 degrees)
- "Marker-over-print" effect with offset color blocks
- Cross-hair targets, mathematical symbols (Sigma, Delta, Infinity)
- Microscopic detail annotations alongside macroscopic bold headers
- Corner metadata: tiny barcodes, timestamps, technical parameters
- High contrast between massive bold headers and tiny 8pt annotations

---

## 2. Color Palette & Roles

**Core Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Blueprint White | Light gray-white | `#F2F2F2` | Background with faint grid texture |
| Functional Teal | Muted sage green | `#B8D8BE` | Major functional blocks, data zones |
| Fluorescent Pink | Vibrant magenta | `#E91E63` | Warnings, critical data, winner highlights |
| Marker Yellow | Vivid lemon | `#FFF200` | Translucent highlighter for keywords |
| Charcoal Brown | Deep brown-black | `#2D2926` | Technical grids, coordinates, hairlines |

**Supporting Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Pure White | White | `#FFFFFF` | Overlays, inverted text on dark blocks |
| Pure Black | Black | `#000000` | Maximum contrast, barcode lines |
| Muted Gray | Medium gray | `#BDBDBD` | Secondary grid lines, ghosted annotations |
| Light Grid | Pale gray | `#E0E0E0` | Blueprint grid lines |

**Semantic Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Winner/Best | Fluorescent pink | `#E91E63` | Top pick, best option |
| Warning | Fluorescent pink | `#E91E63` | Caution, alert |
| Highlight | Marker yellow | `#FFF200` | Emphasized keywords, numbers |
| Data Zone | Functional teal | `#B8D8BE` | Comparison blocks, data regions |
| Technical | Charcoal brown | `#2D2926` | All lines, coordinates, text |

---

## 3. Typography Rules

**Font Family:**
- Headers: Brutalist sans-serif (e.g., "Helvetica Now Display Black", "Arial Black", "Druk Wide")
- Body: Professional sans-serif (e.g., "Inter", "Helvetica Neue", "Roboto")
- Technical: Monospace or ultra-crisp sans-serif (e.g., "SF Mono", "IBM Plex Mono")

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Massive Header | Brutalist Sans | 48-72px | 900 | 1.0 | -0.02em | Maximum visual impact |
| Section Header | Clean Sans | 20-28px | 700 | 1.2 | 0em | Clear section divisions |
| Body Text | Professional Sans | 13-15px | 400 | 1.5 | 0em | Readable paragraphs |
| Technical Label | Monospace | 8-10px | 400 | 1.3 | 0.05em | Precise, small annotations |
| Coordinate | Monospace | 9px | 500 | 1.2 | 0.03em | Alphanumeric grid labels |
| Number Highlight | Bold Sans | 24-36px | 700 | 1.0 | -0.01em | With yellow marker background |
| Warning Text | Bold Sans | 12-14px | 700 | 1.3 | 0.02em | Pink, urgent |
| Metadata | Monospace | 6-8px | 400 | 1.2 | 0.08em | Corner barcodes, timestamps |

**Typography Principles:**
- Dramatic scale contrast: 72px headers vs 8px annotations
- ALL CAPS for headers and coordinates
- Tight tracking on large headers; loose on technical labels
- Numbers are heroes — large, highlighted, impossible to miss

---

## 4. Component Stylings

### Buttons
- **Primary:** Charcoal fill, white text, sharp corners, hairline border
- **Secondary:** Teal fill, charcoal text, sharp corners
- **Alert:** Fluorescent pink fill, white text, sharp corners
- **Coordinate Button:** Small square with coordinate label, monospace

### Cards & Containers
- **Functional Block:** Teal `#B8D8BE` fill at 20-40% opacity, sharp corners, no border or 1px charcoal hairline
- **Data Zone:** Rectangle with coordinate label in corner, teal tint background
- **Alert Panel:** Pink `#E91E63` border, white background, warning symbol

### Inputs & Forms
- **Search:** Minimal outline, charcoal border, coordinate-style placeholder
- **Filter:** Row of small coordinate-labeled toggles
- **Data Field:** Underlined input with unit label (mm, degrees)

### Navigation
- **Zone Navigator:** Grid of coordinate-labeled tabs (A1, A2, B1...)
- **Section Tabs:** Horizontal tabs with teal active indicator
- **Progress:** Vertical ruler with tick marks showing position

### Image Treatment
- All visuals are technical diagrams or schematic illustrations
- Exploded views with dotted connector lines
- Cross-sections with anchor point circles
- No photographs or realistic renders

### Distinctive Components
- **Coordinate Label:** Alphanumeric grid code (R-20, G-02, SEC-08) in 9px monospace
- **Functional Block:** Teal-tinted rectangle for data zones and comparison areas
- **Exploded View:** Components separated along axis with dotted lines and anchor points
- **Cross-Hair Target:** Perpendicular hairlines forming a plus sign for center points
- **Marker Highlight:** Yellow `#FFF200` block behind text, offset 1-2px
- **Fluorescent Alert Badge:** Pink `#E91E63` rounded rectangle or diamond with white bold text
- **Technical Ruler:** Horizontal/vertical scale with precise tick marks and measurements
- **Corner Metadata:** Tiny barcodes, timestamps, technical parameters in 6-8px text
- **Mathematical Symbol:** Sigma, Delta, Infinity as decorative accents near data
- **Dimension Line:** Hairline with arrowheads and precise measurement label
- **Hairline Grid:** 0.5px `#E0E0E0` lines forming blueprint texture

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 4px (precision is key)
- Grid gap: 8-12px
- Module padding: 16-24px
- Section separation: 32-48px
- Page margin: 24px

**Grid & Container:**
- Strict underlying grid visible as faint hairlines
- Canvas divided into labeled zones (A1, A2, B1, B2...)
- Modules snap to grid intersections
- Maximum content width: 1200px for dense technical layouts

**Whitespace Philosophy:**
- Minimal whitespace — blueprint grid fills empty areas
- High information density is intentional
- Every pixel should contain information or grid texture
- White space is the grid itself, not empty canvas

**Border Radius Scale:**
- Sharp: 0px (for most elements — technical aesthetic)
- Small: 2px (for alert badges)
- Medium: 4px (for highlight blocks)

---

## 6. Depth & Elevation

**Elevation Table:**

| Level | Treatment | Use |
|-------|-----------|-----|
| Blueprint Grid | Flat, no shadow | Background texture |
| Functional Blocks | Flat, subtle tint | Data zones, comparison areas |
| Hairlines & Borders | Flat, 1px lines | Grids, coordinates, dividers |
| Text & Highlights | Flat, offset effect | Marker highlight offset |
| Overlays | Light shadow | Info panels, tooltips |

**Shadow Philosophy:**
The Pop Laboratory style is fundamentally flat. No gradients, no shadows, no 3D effects. Depth is implied only through:
- Layering (grid below blocks, text above all)
- The "marker-over-print" offset effect
- Cross-hair lines extending beyond elements
- Scale contrast between large and small elements

---

## 7. Do's and Don'ts

### Do's
- Use the four core colors strictly: teal, pink, yellow, charcoal
- Label every module with coordinate codes
- Include fine grid lines and coordinate annotations throughout
- Maintain dramatic scale contrast between headers and annotations
- Use mathematical symbols as decorative accents
- Add corner metadata (barcodes, timestamps) for authenticity
- Use ALL CAPS for headers and coordinates
- Keep information density high
- Use the marker-over-print offset effect
- Include precise dimension lines and measurements

### Don'ts
- Don't use cute or cartoonish doodles
- Don't introduce soft pastels or generic textures
- Don't leave empty white space — fill with grid or annotations
- Don't use flat vector stock icons — draw custom technical symbols
- Don't allow organic or hand-drawn imperfections
- Don't use more than the defined four-color system
- Don't use gradients, shadows, or 3D effects
- Don't use decorative or script fonts
- Don't forget the coordinate labels
- Don't make all text the same size — contrast is essential

---

## 8. Responsive Behavior

**Breakpoints:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, grid simplified, coordinates abbreviated, alerts prominent |
| Tablet | 640-1024px | 2-column layout, annotations reduced to essentials |
| Desktop | > 1024px | Full grid, all annotations readable, multi-column modular layout |

**Touch Targets:**
- Coordinate buttons: 40x40px minimum
- Alert badges: 44x44px minimum
- Navigation tabs: 48px height minimum

**Collapsing Strategy:**
- Multi-column modules stack vertically on mobile
- Technical annotations collapse to essential coordinates only
- Corner metadata hides on mobile
- Fluorescent alerts remain prominent at all sizes

**Image Behavior:**
- Technical diagrams scale proportionally
- Hairlines must remain visible at all sizes (minimum 1px)
- Grid density reduces on smaller screens
- Marker highlights maintain contrast

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Core: `#B8D8BE` (teal), `#E91E63` (pink), `#FFF200` (yellow), `#2D2926` (charcoal)
- Background: `#F2F2F2` with faint grid
- Supporting: `#FFFFFF` (white), `#000000` (black), `#BDBDBD` (gray)
- Grid lines: `#E0E0E0` at 0.5px
- Four-color system strictly enforced

### Example Component Prompts

1. **Technical Module:** "Create a Pop Laboratory style data module. Light gray `#F2F2F2` background with faint grid. Top-left corner: coordinate label 'R-20' in 9px monospace `#2D2926`. Module fill: `#B8D8BE` at 30% opacity. Header: 'SPECIFICATION' in 48px brutalist sans `#2D2926`. Body: technical parameters in 13px sans-serif. Corner: tiny barcode and timestamp in 7px monospace."

2. **Comparison Grid:** "Design a 3-column comparison grid in Pop Laboratory style. Each column: teal-tinted functional block with coordinate label (A-01, A-02, A-03). Massive header at top. Each cell contains data with yellow `#FFF200` marker highlights on key numbers. Pink `#E91E63` 'WINNER' badge on best option. Hairline grid throughout. Charcoal brown text."

3. **Exploded View Diagram:** "Create an exploded view diagram in Pop Laboratory style. Components separated along vertical axis with dotted connector lines and anchor point circles. Dimension lines with precise measurements (0.5mm, 1.8mm, 45 degrees). Cross-hair targets at center points. Coordinate labels on each part. Charcoal lines on light gray background."

4. **Alert Panel:** "Design a warning alert panel. Fluorescent pink `#E91E63` border, white background. Warning symbol in pink. Bold warning text. Small technical annotation below. Coordinate label 'SEC-08' in corner. Hairline grid texture in background."

5. **Marker Highlight Text:** "Create a text block with marker-over-print effect. Body text in 14px charcoal `#2D2926`. Key phrases highlighted with yellow `#FFF200` blocks slightly offset (2px) behind text. Mathematical symbols (Sigma, Delta) as decorative accents. Coordinate label above."

6. **Technical Ruler Scale:** "Design a vertical technical ruler with precise tick marks. 0.5mm minor ticks, 1.0mm major ticks with labels. Charcoal `#2D2926` hairline. Monospace labels at 9px. Part of a larger blueprint grid layout."

7. **Pop Laboratory Dashboard:** "Create a dense technical dashboard in Pop Laboratory style. Light gray grid background. Multiple functional blocks in teal tint. Massive header 'ANALYSIS' in 64px brutalist font. Fluorescent pink alerts for critical data. Yellow marker highlights on key metrics. Coordinate labels on every module. Corner metadata with barcodes. High information density, no empty space."

### Iteration Guide
1. Define the information structure and module boundaries
2. Assign coordinate labels to every module
3. Apply the four-color system strictly
4. Add blueprint grid background texture
5. Place massive headers for major sections
6. Fill periphery with tiny technical annotations
7. Add dimension lines and cross-hair targets
8. Apply marker highlights to key data
9. Add corner metadata for authenticity
10. Final check: no empty space, all coordinates present, four colors only
