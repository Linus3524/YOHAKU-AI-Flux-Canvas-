# Knolling Design System

Organized flat-lay with top-down arrangement, perfect symmetry, and catalog-style precision.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:**
- Meticulously organized and systematic
- Clean, precise, and satisfying
- Analytical yet aesthetically pleasing
- Professional and methodical

**Emotional Description:**
The Knolling style evokes the deeply satisfying feeling of perfect organization—every item in its place, every angle aligned, every spacing equal. Like opening a perfectly organized toolbox or seeing a chef's mise en place, it creates a sense of calm, control, and visual harmony. The top-down perspective removes hierarchy, making every item equally important.

**Key Characteristics:**
- Top-down (bird's eye) camera angle
- Objects arranged at 90-degree angles to each other
- Equal spacing between all items
- Clean, grid-like organization
- Symmetry and visual order
- No overlapping items
- Solid color background surface
- Natural object colors preserved
- Catalog or inventory aesthetic
- Connecting lines from labels to items

---

## 2. Color Palette & Roles

**Background Surface Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Pure Black | Deep black | `#1A1A1A` | Dramatic product photography background |
| Pure White | Clean white | `#FFFFFF` | Clean, clinical organization backdrop |
| Soft Gray | Neutral gray | `#E8E8E8` | Neutral, versatile background |
| Warm Beige | Sand tone | `#E5DED5` | Warm, organic background |
| Navy Blue | Deep blue | `#1E3A5F` | Premium, sophisticated backdrop |
| Concrete Gray | Medium gray | `#B8B8B8` | Industrial, raw background |

**Object Colors (Natural/Authentic):**
| Role | Usage |
|------|-------|
| Object Natural | Preserve the authentic color of each item—do not recolor |
| Metal Silver | Stainless steel, aluminum objects |
| Wood Brown | Natural wood tones |
| Plastic Colors | Original product colors |
| Fabric Tones | Textile natural colors |
| Glass Clear | Transparent with subtle reflections |

**Accent Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Label Text | Dark gray | `#333333` | Item labels, descriptions |
| Connecting Line | Medium gray | `#999999` | Lines from labels to objects |
| Annotation | Charcoal | `#4A4A4A` | Numbers, measurements |
| Highlight | Soft blue | `#4A90D9` | Selected or featured item |

**Shadow Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Soft Shadow | Subtle gray | `rgba(0,0,0,0.15)` | Object drop shadows |
| Deep Shadow | Darker gray | `rgba(0,0,0,0.25)` | Larger/heavier objects |

---

## 3. Typography Rules

**Font Family:**
- Primary: Clean, technical sans-serif (e.g., "Helvetica Neue", "Arial", "Roboto", "Inter")
- Secondary: Monospace for measurements and codes (e.g., "SF Mono", "Consolas")
- Accent: Minimal serif for editorial touches (optional)

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Collection Title | Sans-serif | 28-36px | 300 | 1.2 | 0.05em | Light, elegant |
| Category Label | Sans-serif | 14-16px | 600 | 1.3 | 0.1em | Uppercase, spaced |
| Item Name | Sans-serif | 12-14px | 500 | 1.4 | 0.02em | Clean, readable |
| Item Code | Monospace | 11-12px | 400 | 1.3 | 0.03em | Product codes |
| Measurement | Monospace | 11px | 400 | 1.2 | 0em | Dimensions |
| Caption | Sans-serif | 11-12px | 400 | 1.4 | 0.01em | Small descriptions |
| Number Badge | Sans-serif | 14px | 700 | 1.0 | 0.05em | Item numbers |

**Typography Principles:**
- Minimal text—let the organized objects speak
- Labels positioned outside the object arrangement
- Connecting lines from label to object
- Catalog-style numbering (01, 02, 03...)
- Clean, technical feel—no decorative fonts

---

## 4. Component Stylings

### Buttons
- **Primary:** Minimal outline style, thin border, transparent fill
- **Secondary:** Text-only with subtle underline
- **Filter Button:** Small pill shape for category filtering
- **View Toggle:** Icon buttons for grid/list view

### Cards & Containers
- **Category Section:** Defined by spacing, not borders
- **Item Card (List View):** Thin horizontal line separator, image + details
- **Info Panel:** Side panel with item details when selected

### Inputs & Forms
- **Search:** Minimal input with magnifying glass icon
- **Category Filter:** Horizontal scrollable tag list
- **Sort Selector:** Simple dropdown

### Navigation
- **Category Nav:** Horizontal list of category names
- **Breadcrumb:** Minimal path indicator
- **Pagination:** Simple numbered dots or arrows

### Image Treatment
- Objects photographed from directly above (90-degree angle)
- Consistent lighting across all objects
- Soft, even shadows beneath each item
- No reflections or glossy highlights
- Objects isolated on solid background

### Distinctive Components
- **Organized Grid:** Items arranged in rows and columns at 90 degrees
- **Connecting Line:** Thin line from label to corresponding object
- **Number Badge:** Circular or square badge with item number
- **Category Divider:** Invisible spacing zone between categories
- **Measurement Annotation:** Small dimension labels
- **Shadow Layer:** Consistent soft shadow beneath each object
- **Arrangement Frame:** Invisible bounding box around organized group

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 8px
- Object gap: 24-32px (equal spacing between all items)
- Category gap: 64-80px (larger separation between groups)
- Edge padding: 48px from container edges
- Label offset: 16px from object edge

**Grid & Container:**
- Implicit grid based on object sizes
- Objects align to invisible grid lines
- Rows and columns at perfect 90-degree angles
- Container: full width with generous padding
- Layout is determined by object count and aspect ratios

**Whitespace Philosophy:**
- Equal spacing is sacred—every gap must be identical
- Background color provides the "white space"
- No clutter—every item must be clearly separated
- Symmetry creates visual calm

**Border Radius Scale:**
- Sharp: 0px (for most elements)
- Small: 2px (for number badges)
- None for containers—layout is defined by spacing

---

## 6. Depth & Elevation

**Elevation Table:**

| Level | Treatment | Use |
|-------|-----------|-----|
| Background | Flat surface | Solid color backdrop |
| Object Shadow | Soft drop shadow | Each item casts subtle shadow |
| Elevated Object | Larger shadow | Heavier items appear slightly raised |
| Selected Item | Highlight ring | Featured/selected object |

**Shadow Philosophy:**
Shadows in knolling are soft, even, and consistent. Every object should cast a similar subtle shadow to ground it on the surface. The shadow direction should be consistent (typically top-left light source). Shadows are not for depth hierarchy—they're for realism and grounding. All objects exist on the same plane.

---

## 7. Do's and Don'ts

### Do's
- Arrange all objects at 90-degree angles to each other
- Maintain equal spacing between every item
- Use a solid, uniform background color
- Photograph from directly above (top-down)
- Preserve natural object colors
- Include labels with connecting lines
- Group related items into categories
- Use consistent lighting and shadows
- Number items catalog-style (01, 02, 03...)
- Keep the arrangement symmetrical where possible

### Don'ts
- Don't overlap objects
- Don't use angled or diagonal arrangements
- Don't mix multiple background colors
- Don't use busy or textured backgrounds
- Don't crowd items—maintain equal gaps
- Don't use drop shadows of varying directions
- Don't add decorative elements
- Don't use rounded arrangements
- Don't mix different photography styles
- Don't add text directly on top of objects

---

## 8. Responsive Behavior

**Breakpoints:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single row scrolling, fewer items per view |
| Tablet | 640-1024px | 2-3 column grid arrangement |
| Desktop | > 1024px | Full grid, all items visible |

**Touch Targets:**
- Item selection: 44x44px minimum
- Category tabs: 48px height minimum
- Navigation arrows: 44x44px minimum

**Collapsing Strategy:**
- Grid reduces columns on smaller screens
- Categories may collapse to dropdown on mobile
- Item details appear as overlay on mobile
- Horizontal scrolling for wide arrangements

**Image Behavior:**
- Object images maintain aspect ratio
- Grid reflows to fit available width
- Shadows scale proportionally
- Labels may hide on very small screens

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Backgrounds: `#1A1A1A` (black), `#FFFFFF` (white), `#E8E8E8` (gray), `#E5DED5` (beige), `#1E3A5F` (navy)
- Labels: `#333333` (text), `#999999` (connecting lines)
- Annotations: `#4A4A4A` (numbers), `#4A90D9` (highlight)
- Shadows: `rgba(0,0,0,0.15)` (soft)
- Always top-down perspective
- Always 90-degree arrangements
- Always equal spacing

### Example Component Prompts

1. **Knolling Product Grid:** "Create a knolling layout with 12 tech gadgets arranged on a `#1A1A1A` black background. Top-down view. Items arranged in 3 rows of 4 at 90-degree angles. Equal 32px spacing between all items. Each item has a soft shadow. Labels with connecting lines on the right side. Catalog numbering 01-12."

2. **Tool Collection Layout:** "Design a knolling arrangement of 8 workshop tools on a `#E8E8E8` gray background. Items in 2 rows of 4. Perfect 90-degree alignment. Equal spacing. Warm lighting with consistent soft shadows. Labels beneath each tool with name and measurement."

3. **Category Organizer:** "Create a knolling-style category display with 3 groups: writing tools (6 items), art supplies (5 items), and accessories (4 items). White `#FFFFFF` background. Each category separated by 64px. Items within categories at 90 degrees with equal spacing. Category labels in uppercase with letter spacing."

4. **Knolling Item Card:** "Design an item detail card for a knolling interface. Left: large product image on white bg. Right: item name, code, dimensions, and category. Clean sans-serif typography. Connecting line graphic element. Minimal, catalog-style design."

5. **Knolling Filter Bar:** "Create a filter bar for a knolling product viewer. Horizontal row of category pills: 'All', 'Tools', 'Electronics', 'Accessories'. Active category has `#1A1A1A` fill and white text. Inactive have 1px border and dark text. Clean, minimal design."

6. **Knolling Comparison View:** "Design a side-by-side knolling comparison of two product sets. Left set on `#F5F5F5` background, right set on `#FFFFFF` background. Each set has 6 items arranged identically. Connecting lines to comparison labels. Clean, analytical layout."

7. **Knolling Inventory Grid:** "Create an inventory grid in knolling style. 20 items arranged in 4 rows of 5 on `#FFFFFF` white background. Each item: product image, number badge (01-20), and small label. Equal 24px spacing. Grid lines visible as subtle guides."

### Iteration Guide
1. Choose a solid background color
2. Select items to organize (8-20 items ideal)
3. Arrange items at 90-degree angles in rows/columns
4. Apply equal spacing between all items
5. Add consistent soft shadows beneath each item
6. Position labels with connecting lines
7. Add catalog-style numbering
8. Group into categories if applicable
9. Final check: equal spacing, 90-degree alignment, no overlaps
