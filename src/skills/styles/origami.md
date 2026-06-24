# Origami Design System

Folded paper forms with geometric precision and Japanese craft heritage.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:**
- Artisanal precision meets mathematical geometry
- Quiet elegance rooted in Japanese craft tradition
- Transformative beauty from simple materials
- Clean, contemplative, and tactile

**Emotional Description:**
The Origami style evokes the meditative focus of paper folding—each crease deliberate, each form emerging from a flat plane into three-dimensional sculpture. It feels handcrafted yet precise, traditional yet modern, simple yet deeply sophisticated.

**Key Characteristics:**
- Geometric folded shapes with visible crease lines
- Low-poly faceted surfaces suggesting paper planes
- Crisp cast shadows showing depth and dimension
- Paper texture visible on all surfaces
- Angular, faceted forms with sharp edges
- Monochromatic or limited color per fold
- Emphasis on transformation (2D to 3D)
- Subtle gradient shadows on fold valleys

---

## 2. Color Palette & Roles

**Primary Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Origami Red | Vibrant paper red | `#E53935` | Primary accent folds, cranes, flowers |
| Origami Blue | Deep paper blue | `#1E88E5` | Water elements, secondary folds |
| Origami Green | Forest paper green | `#43A047` | Nature forms, leaves, stems |
| Origami Gold | Metallic gold paper | `#FFB300` | Premium accents, decorative edges |

**Secondary Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Soft Pink | Blush paper | `#F8BBD9` | Cherry blossom forms |
| Lavender | Light purple | `#CE93D8` | Decorative geometric patterns |
| Teal | Cyan-teal | `#00897B` | Ocean/water themed origami |

**Surface Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Pure White | Clean white | `#FFFFFF` | Primary paper surface, backgrounds |
| Soft Gray | Light neutral | `#F5F5F5` | Secondary backgrounds |
| Warm Cream | Paper tone | `#FAF3E8` | Aged/vintage paper feel |

**Shadow & Depth:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Fold Shadow | Subtle gray | `#BDBDBD` | Valley crease shadows |
| Cast Shadow | Soft gray | `#9E9E9E` | Drop shadows beneath forms |
| Deep Fold | Dark gray | `#757575` | Deep crease lines |

**Neutral Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Charcoal | Dark gray | `#424242` | Text, outline creases |
| Medium Gray | Neutral | `#9E9E9E` | Secondary text, annotations |
| Light Gray | Pale | `#E0E0E0` | Subtle borders, dividers |

---

## 3. Typography Rules

**Font Family:**
- Primary: Clean geometric sans-serif (e.g., "Futura", "Montserrat", "Lato")
- Secondary: Japanese-inspired minimal serif (e.g., "Noto Serif JP", "Crimson Text")
- Accent: Angular display font with sharp edges

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display Title | Geometric Sans | 48-72px | 300 (Light) | 1.1 | 0.15em | All caps, wide tracking |
| Section Header | Geometric Sans | 28-36px | 400 | 1.2 | 0.1em | Sentence case, elegant spacing |
| Subheader | Geometric Sans | 20-24px | 500 | 1.3 | 0.05em | Clean and minimal |
| Body Text | Sans-serif | 16px | 400 | 1.6 | 0.02em | Comfortable reading |
| Caption/Label | Sans-serif | 12-14px | 500 | 1.4 | 0.08em | Small, uppercase labels |
| Annotation | Serif | 11-13px | 400 (Italic) | 1.5 | 0.03em | Fold instructions, notes |
| Number/Badge | Geometric Sans | 18-24px | 700 | 1.0 | 0.05em | Step numbers, fold counts |

**Typography Principles:**
- Wide letter-spacing for headers to evoke breathing room
- Light font weights preferred for elegance
- Minimal text—let the folded forms speak
- Annotations use italic serif for craft-journal feel
- Numbers are prominent for step-by-step sequences

---

## 4. Component Stylings

### Buttons
- **Primary:** Solid origami color background, white text, sharp corners (0px radius), subtle fold-line shadow on hover
- **Secondary:** Outlined with 2px solid charcoal border, transparent fill, charcoal text
- **Ghost:** No border, text-only with subtle underline on hover
- **Step Button:** Circular with fold number inside, origami color fill, white text

### Cards & Containers
- **Fold Card:** Sharp-cornered rectangle with visible "crease" line at 45-degree angle, subtle shadow on one half
- **Info Panel:** White background with thin 1px gray border, origami accent corner fold decoration
- **Step Card:** Numbered sequence cards with connecting dashed lines between them

### Inputs & Forms
- **Text Input:** Bottom-border only (1px charcoal), no background fill, minimal label above
- **Select:** Sharp corners, thin border, origami color chevron indicator
- **Checkbox:** Square (never rounded) with origami color fill when checked

### Navigation
- **Tab Bar:** Horizontal tabs with origami paper-fold indicator on active tab
- **Breadcrumb:** Minimal text with origami-fold chevron separators
- **Menu:** Vertical list with subtle left-border accent on hover

### Image Treatment
- Images displayed within folded-paper frame borders
- Optional low-poly filter overlay on photographs
- Images may be "folded" at corners with triangular clip

### Distinctive Components
- **Origami Figure:** SVG/paper-style illustration of folded forms (cranes, boxes, flowers)
- **Crease Line:** Decorative 1px dashed or solid lines at 45-degree angles
- **Fold Sequence:** Numbered step visualization with progressive folding stages
- **Paper Texture Overlay:** Subtle grain texture on all colored surfaces

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 8px
- Fold spacing: 16px (2 units)
- Section gap: 48px (6 units)
- Content padding: 24px (3 units)
- Card internal padding: 20px

**Grid & Container:**
- 12-column grid with 24px gutters
- Maximum container width: 1200px
- Asymmetric layouts inspired by folded paper planes
- Diagonal divisions at 45-degree angles for visual interest
- Content may "fold" across grid lines

**Whitespace Philosophy:**
- Generous whitespace to let each folded form breathe
- White space is as important as the content—like the negative space in origami
- Avoid clutter; each element should feel deliberately placed

**Border Radius Scale:**
- Sharp: 0px (default for most elements—paper has no rounded corners)
- Micro: 2px (for tiny UI elements only)
- None for cards, panels, or containers

---

## 6. Depth & Elevation

**Elevation Table:**

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow, pure 2D | Background layers, inactive states |
| Folded | 1px offset shadow, slight color shift | Interactive cards, hover states |
| Raised | Soft drop shadow (0 4px 8px rgba(0,0,0,0.1)) | Floating elements, modals |
| Layered | Multiple overlapping shadows | Complex origami compositions |
| Cast Shadow | Directional shadow beneath form | 3D origami illustrations |

**Shadow Philosophy:**
Shadows in the Origami system are not generic drop shadows—they represent the physical reality of paper casting shadows. Use directional shadows that suggest a single light source from top-left. Shadows should be crisp at the edge (paper is thin) and soft as they extend. Crease shadows are darker lines within the form itself, indicating folded valleys.

---

## 7. Do's and Don'ts

### Do's
- Use sharp, angular shapes and 0px border radius
- Include visible fold/crease lines on decorative elements
- Apply subtle paper texture to colored surfaces
- Use a limited color palette per composition (1-2 origami colors max)
- Show transformation/progression in multi-step layouts
- Use geometric sans-serif fonts with wide tracking
- Include directional shadows suggesting physical paper
- Embrace negative space and minimalism
- Use 45-degree and 90-degree angles for visual harmony

### Don'ts
- Don't use rounded corners on cards or containers
- Don't apply gradients to simulate depth—use shadows and facets
- Don't use more than 3 colors in a single origami composition
- Don't use drop shadows without directional consistency
- Don't overcrowd the layout—origami needs breathing room
- Don't use photographic textures on paper surfaces
- Don't use cursive or decorative fonts—keep it geometric
- Don't add unnecessary borders or frames
- Don't use 3D bevel/emboss effects

---

## 8. Responsive Behavior

**Breakpoints:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, origami figures scale down, stacked fold sequences |
| Tablet | 640-1024px | 2-column grid, medium origami figures |
| Desktop | > 1024px | Full 12-column grid, large origami compositions |

**Touch Targets:**
- Minimum 44x44px for all interactive elements
- Step buttons increase to 48x48px on mobile
- Fold sequence navigation uses swipe gestures on mobile

**Collapsing Strategy:**
- Multi-column fold sequences collapse to single column on mobile
- Side panels become bottom sheets
- Navigation collapses to hamburger menu with origami-fold animation

**Image Behavior:**
- Origami illustrations scale proportionally
- Complex multi-piece compositions may simplify on smaller screens
- Paper texture remains visible at all sizes

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary accents: `#E53935` (red), `#1E88E5` (blue), `#43A047` (green), `#FFB300` (gold)
- Backgrounds: `#FFFFFF` (white), `#F5F5F5` (soft gray), `#FAF3E8` (cream)
- Shadows: `#BDBDBD` (fold), `#9E9E9E` (cast), `#757575` (deep)
- Text: `#424242` (charcoal), `#9E9E9E` (secondary)
- Always sharp corners (0px radius)
- Always include paper texture and fold lines

### Example Component Prompts

1. **Origami Hero Section:** "Create a hero section with a large origami crane illustration in `#E53935` on a `#FFFFFF` background. Include a subtle paper texture overlay. Title in geometric sans-serif, light weight, wide letter-spacing. Add a directional shadow beneath the crane suggesting top-left light source."

2. **Fold Sequence Card:** "Design a step-by-step origami instruction card with 4 numbered steps. Each step shows a simplified geometric fold stage. Use `#1E88E5` for step numbers on white circular badges. Connect steps with dashed 1px `#BDBDBD` lines. Sharp corners, minimal text."

3. **Origami Feature Grid:** "Build a 3-column feature grid where each card has a different origami color accent (`#43A047`, `#FFB300`, `#E53935`). Cards have visible 45-degree crease line decoration. Icon area shows a small origami form. Clean sans-serif text."

4. **Origami Navigation Bar:** "Create a horizontal navigation bar with origami-fold tab indicators. Active tab shows a small triangular fold in primary color. White background, charcoal text, 0px border radius on all elements. Minimal and clean."

5. **Origami Info Panel:** "Design an information panel with a decorative origami corner fold in the top-right. White background with subtle paper texture. Content uses 16px body text with 20px subheaders. Include a `#E53935` accent line on the left edge."

6. **Origami Button Set:** "Create three buttons: primary (solid `#43A047` with white text), secondary (outlined charcoal), ghost (text only). All buttons have 0px border radius and sharp corners. Primary button has subtle fold-shadow on hover."

7. **Origami Progress Steps:** "Design a 5-step progress indicator with origami-style numbered badges. Completed steps in `#1E88E5`, current step in `#E53935`, future steps in `#E0E0E0`. Connect with thin solid lines. Each badge is a folded-paper square."

### Iteration Guide
1. Start with the base paper color (white or cream) and choose 1-2 origami accent colors
2. Add geometric shapes with sharp corners and visible crease lines
3. Apply subtle paper texture to all colored surfaces
4. Add directional shadows for depth (single light source from top-left)
5. Review and remove any rounded corners—everything must be angular
6. Check color count—limit to 3 colors maximum per composition
7. Add fold sequence or transformation element if applicable
8. Verify typography uses geometric sans-serif with wide tracking
9. Final pass: ensure whitespace feels deliberate and meditative
