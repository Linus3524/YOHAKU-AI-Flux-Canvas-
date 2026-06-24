# LEGO Brick Design System

Toy brick construction with playful aesthetic, modular building, and vibrant primary colors.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:**
- Playful, creative, and imaginative
- Modular and systematic
- Accessible to all ages
- Constructive and educational

**Emotional Description:**
The LEGO Brick style evokes the joy of building and creation—the satisfying click of bricks connecting, the endless possibilities of modular construction. It feels playful yet precise, childlike yet sophisticated. The bright primary colors and visible studs create instant recognition and a sense of fun, while the modular nature suggests infinite combinations.

**Key Characteristics:**
- Visible brick studs on top surfaces
- Modular, stackable construction elements
- Classic primary color palette
- Plastic sheen and slight gloss
- Building instruction style layouts
- Minifigure characters for scale and personality
- Step-by-step assembly visualization
- Clean, geometric forms
- Playful, bold typography

---

## 2. Color Palette & Roles

**Classic LEGO Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| LEGO Red | Bright red | `#C91A09` | Primary accent, bricks, characters |
| LEGO Blue | Royal blue | `#0055BF` | Secondary accent, water elements |
| LEGO Yellow | Bright yellow | `#F2CD37` | Primary highlight, minifigure heads |
| LEGO Green | Bright green | `#237841` | Nature, grass, trees |
| LEGO White | Pure white | `#FFFFFF` | Base plates, neutral bricks |
| LEGO Black | Deep black | `#1B2A34` | Outlines, tires, details |

**Extended LEGO Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| LEGO Orange | Bright orange | `#FE8A18` | Construction, caution |
| LEGO Purple | Rich purple | `#81007B` | Creative accents |
| LEGO Brown | Earth brown | `#583927` | Wood, earth, animals |
| LEGO Gray | Medium gray | `#A0A5A9` | Concrete, metal, roads |
| LEGO Light Gray | Light gray | `#9BA19D` | Secondary structural |
| LEGO Tan | Sand tan | `#E4CD9E` | Desert, skin tones |

**Surface & Background:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Baseplate Gray | Light gray | `#BCB4A5` | Classic baseplate |
| Baseplate Green | Green base | `#4B9F4A` | Grass baseplate |
| Baseplate Blue | Blue base | `#5C66A8` | Water baseplate |
| Background White | White | `#FFFFFF` | Clean backgrounds |
| Background Light | Soft gray | `#F0F0F0` | Neutral backgrounds |

**Plastic Sheen Highlights:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Stud Highlight | Light tint | 20% white overlay | Top of studs |
| Edge Highlight | Bright edge | 30% white overlay | Top edges of bricks |
| Shadow Side | Dark shade | 20% black overlay | Side faces of bricks |

---

## 3. Typography Rules

**Font Family:**
- Primary: Bold, blocky sans-serif (e.g., "Montserrat Black", "Arial Black", "Impact")
- Secondary: Clean sans-serif for body text (e.g., "Helvetica", "Roboto")
- Accent: Playful rounded font for children's content
- Numbers: Bold, clear numerals for step indicators

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Set Title | Blocky Sans | 36-48px | 900 | 1.1 | 0.02em | Bold, playful |
| Section Header | Blocky Sans | 24-32px | 800 | 1.2 | 0.01em | Strong, clear |
| Step Number | Bold Sans | 48-64px | 900 | 1.0 | 0em | Very large, prominent |
| Component Label | Sans-serif | 14-16px | 600 | 1.3 | 0em | Clear identification |
| Body Text | Sans-serif | 14-16px | 400 | 1.5 | 0em | Readable descriptions |
| Instruction | Sans-serif | 12-14px | 500 | 1.4 | 0em | Step details |
| Badge Text | Bold Sans | 12-14px | 700 | 1.0 | 0.03em | Part counts, labels |

**Typography Principles:**
- Bold, heavy weights for headers to match brick solidity
- Large step numbers for building instructions
- Clear, readable sans-serif for all body text
- Playful but not childish—appeals to all ages
- Numbers are prominent for part counts and steps

---

## 4. Component Stylings

### Buttons
- **Primary:** Solid LEGO color fill, white text, 4px radius (slightly rounded corners like bricks)
- **Secondary:** Outlined with 2px LEGO color border, transparent fill
- **Action:** Bright yellow fill with black text, playful appearance
- **Brick Button:** Button styled as a LEGO brick with visible studs

### Cards & Containers
- **Brick Card:** White or light gray background, subtle border, clean layout
- **Step Card:** Large step number, illustration, and part callouts
- **Parts Panel:** Grid of brick illustrations with quantities
- **Set Box:** Styled like a LEGO set box with image and info

### Inputs & Forms
- **Text Input:** Clean border, white fill, subtle focus state
- **Quantity Selector:** +/- buttons with number display
- **Color Picker:** Grid of LEGO-colored circles

### Navigation
- **Step Navigator:** Large prev/next arrows with step numbers
- **Tab Bar:** Brick-styled tabs with color indicators
- **Progress Bar:** Horizontal bar with completed steps as colored bricks

### Image Treatment
- Brick illustrations with visible studs and plastic sheen
- Isometric or 3/4 perspective for brick assemblies
- Minifigure characters for scale and storytelling
- Clean, bright photography style
- White or neutral backgrounds

### Distinctive Components
- **LEGO Brick:** Rectangular block with 8px radius corners, visible circular studs on top
- **Stud Pattern:** Grid of circles on brick top surface
- **Minifigure:** Simplified human figure with cylindrical head, blocky body
- **Baseplate:** Large flat plate with stud grid
- **Step Assembly:** Progressive building visualization
- **Part Callout:** Numbered circle pointing to specific brick
- **Connection Indicator:** Arrow showing how bricks connect
- **Piece Counter:** Small badge showing "x2", "x4" quantities

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 8px (matching LEGO brick proportions)
- Brick gap: 0px (bricks connect flush)
- Component gap: 16px (2 units)
- Section gap: 48px (6 units)
- Stud grid: 8px spacing (standard LEGO stud pitch)

**Grid & Container:**
- 8px base grid (LEGO brick unit)
- Container max-width: 1200px
- Layouts inspired by building instructions
- Step-by-step vertical flow
- Parts list in grid layout

**Whitespace Philosophy:**
- Clean backgrounds let bricks stand out
- Building steps need clear separation
- Parts lists are dense but organized
- White space around finished models

**Border Radius Scale:**
- Brick Corner: 4px (slightly rounded like real bricks)
- Small: 4px (for buttons, small elements)
- Medium: 8px (for cards, panels)
- Large: 12px (for modals, large containers)

---

## 6. Depth & Elevation

**Elevation Table:**

| Level | Treatment | Use |
|-------|-----------|-----|
| Baseplate | Flat, no shadow | Foundation layer |
| Single Brick | Subtle shadow | Individual bricks |
| Stacked Brick | Shadow beneath stack | Connected assemblies |
| Floating Element | Larger shadow | UI elements, modals |
| Highlighted | Glow effect | Selected bricks, important items |

**Shadow Philosophy:**
LEGO bricks cast crisp, defined shadows that suggest the physical plastic material. Shadows are slightly offset and have sharp edges (not blurred). Stacked bricks create unified shadows beneath the entire assembly. The plastic sheen is shown through subtle highlights on top surfaces and edges, not through shadows.

---

## 7. Do's and Don'ts

### Do's
- Use bright, saturated primary colors
- Show visible studs on brick surfaces
- Use slightly rounded corners (like real bricks)
- Include step-by-step building sequences
- Use minifigures for scale and personality
- Show plastic sheen with subtle highlights
- Use bold, blocky typography
- Maintain modular, grid-based layouts
- Include part quantities (x2, x4)
- Use isometric or 3/4 perspective for assemblies

### Don'ts
- Don't use muted or pastel colors
- Don't make corners too sharp or too round
- Don't use gradients for brick colors
- Don't forget the stud details
- Don't use realistic textures (wood, metal)
- Don't make bricks look flat—add depth
- Don't use thin or delicate fonts
- Don't crowd building steps
- Don't use photographic backgrounds
- Don't make shadows too soft or blurred

---

## 8. Responsive Behavior

**Breakpoints:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, large touch targets, simplified steps |
| Tablet | 640-1024px | 2-column parts grid, standard step view |
| Desktop | > 1024px | Full layout, large brick visualizations |

**Touch Targets:**
- Brick selection: 48x48px minimum
- Step navigation: 56x56px minimum
- Part items: 44x44px minimum
- Action buttons: 48x48px minimum

**Collapsing Strategy:**
- Parts grid reduces columns on smaller screens
- Building steps stack vertically
- 3D brick viewer becomes static image on mobile
- Navigation becomes swipeable step carousel

**Image Behavior:**
- Brick illustrations scale proportionally
- Maintain stud visibility at all sizes
- Isometric views remain consistent
- Part images stay square

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#C91A09` (red), `#0055BF` (blue), `#F2CD37` (yellow), `#237841` (green)
- Extended: `#FE8A18` (orange), `#81007B` (purple), `#583927` (brown), `#A0A5A9` (gray)
- Backgrounds: `#FFFFFF` (white), `#F0F0F0` (light gray), `#BCB4A5` (baseplate)
- Black: `#1B2A34` for outlines and details
- Border radius: 4px for brick corners
- Always show visible studs

### Example Component Prompts

1. **LEGO Hero Section:** "Create a hero section with a large 3D LEGO brick assembly in the center. Use `#C91A09` red, `#0055BF` blue, and `#F2CD37` yellow bricks. White `#FFFFFF` background. Title in bold blocky sans-serif, 48px. Subtitle in 18px regular. Include a minifigure character."

2. **Building Step Card:** "Design a LEGO instruction step card. Large '3' in `#1B2A34` black. Center: isometric view of bricks being connected with action arrow. Below: parts needed shown as small brick illustrations with 'x2' quantity badges. Clean white background."

3. **LEGO Parts Grid:** "Create a parts inventory grid with 12 different LEGO bricks. Each item: brick illustration, part name, color swatch, and quantity badge. Grid layout 4x3. White background. Clean sans-serif labels. Color-coded by brick color."

4. **LEGO Progress Steps:** "Design a 5-step building progress indicator. Each step: circular badge with step number. Completed steps show a small brick icon in LEGO colors. Connecting line between steps. Current step highlighted with `#F2CD37` yellow ring."

5. **LEGO Set Card:** "Create a product card for a LEGO-style set. Top: image of completed model on white bg. Below: set name in bold 20px, piece count badge, difficulty indicator (1-3 bricks), and 'Build' button in `#C91A09` red with white text. Clean card with 8px radius."

6. **LEGO Color Palette Selector:** "Design a color picker with 12 LEGO colors arranged in a grid. Each color: square swatch with LEGO color. Selected color has 2px `#1B2A34` black border and checkmark. Colors: red, blue, yellow, green, orange, purple, brown, black, white, gray, tan, light gray."

7. **LEGO Minifigure Profile:** "Create a character profile card in LEGO style. Left: minifigure illustration. Right: character name, role, and stats (creativity, building skill, imagination) shown as LEGO brick bars. Playful, colorful design on white background."

### Iteration Guide
1. Choose 2-4 primary LEGO colors for the composition
2. Design brick elements with visible studs and 4px rounded corners
3. Add plastic sheen with subtle top-edge highlights
4. Create modular, grid-aligned layouts
5. Include step numbers or part quantities
6. Add minifigure characters if appropriate
7. Use bold, blocky typography
8. Apply crisp shadows (not blurred)
9. Final check: stud visibility, color vibrancy, playful feel
