# IKEA Manual Design System

Minimal line art assembly instruction style with universal visual communication.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:**
- Universally accessible and language-independent
- Clear, patient, and instructional
- Minimalist and functional
- Friendly yet precise

**Emotional Description:**
The IKEA Manual style evokes the quiet confidence of well-designed instructions that anyone can follow, regardless of language. It feels democratic, helpful, and slightly playful—the stick figures and exploded views have a charming simplicity that makes complex assembly feel achievable. The style communicates through pure visual language.

**Key Characteristics:**
- Simple line drawings with minimal detail
- Numbered step sequences in clear order
- Arrow indicators for direction and action
- Exploded assembly views showing component relationships
- Wordless communication (no text instructions)
- Stick figures for scale and human interaction
- Warning symbols for caution
- Clean, uncluttered presentation
- Consistent perspective (usually isometric or flat)

---

## 2. Color Palette & Roles

**Primary Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Line Black | Deep black | `#1A1A1A` | All line drawings, outlines |
| Fill White | Pure white | `#FFFFFF` | Object fills, backgrounds |
| Fill Cream | Warm cream | `#F5F0E8` | Alternative paper background |

**Accent Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Warning Red | Alert red | `#E30613` | Warnings, danger, do-not-do |
| Highlight Blue | Bright blue | `#0058A3` | Important notes, key components |
| Action Green | Success green | `#008A2E` | Correct actions, confirmations |
| Attention Yellow | Caution yellow | `#FFCC00` | Caution, attention needed |

**Background Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| White | Pure white | `#FFFFFF` | Primary instruction background |
| Cream | Warm paper | `#F5F0E8` | Alternative warm background |
| Light Gray | Soft gray | `#F0F0F0` | Step separation, alternate rows |

**Neutral Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Dark Gray | Charcoal | `#4A4A4A` | Secondary lines, details |
| Medium Gray | Gray | `#9E9E9E` | Dashed lines, hidden edges |
| Light Gray | Pale gray | `#E0E0E0` | Subtle backgrounds, separators |

---

## 3. Typography Rules

**Font Family:**
- Primary: Clean, highly legible sans-serif (e.g., "Helvetica Neue", "Arial", "Roboto")
- Numbers: Bold, clear numerals for step indicators
- Minimal text usage—style is primarily visual

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Step Number | Sans-serif | 36-48px | 700 | 1.0 | 0em | Large, bold, prominent |
| Part Number | Sans-serif | 14-16px | 600 | 1.2 | 0.05em | Component identifiers |
| Title | Sans-serif | 18-24px | 600 | 1.3 | 0em | Product name, header |
| Warning Text | Sans-serif | 12-14px | 600 | 1.4 | 0em | Minimal warning labels |
| Legend Item | Sans-serif | 11-12px | 400 | 1.4 | 0em | Part list descriptions |
| Quantity | Sans-serif | 12px | 700 | 1.0 | 0em | "x2", "x4" indicators |

**Typography Principles:**
- Text is minimal and supplementary—images do the talking
- Step numbers are the largest, most prominent text element
- Part numbers use clear, bold styling
- When text is necessary, keep it extremely brief
- All text should be translatable/universal

---

## 4. Component Stylings

### Buttons
- **Action Button:** Simple rectangle with arrow icon, minimal styling
- **Step Navigator:** Large circular buttons with prev/next arrows
- **Part Button:** Small circle with part letter/number

### Cards & Containers
- **Step Card:** White background, thin border, large step number in corner
- **Part List Panel:** Grid of small part illustrations with quantity labels
- **Warning Box:** Yellow or red border, warning symbol, minimal text

### Inputs & Forms
- Minimal inputs—style is not form-heavy
- When needed: simple outlined boxes with labels

### Navigation
- **Step Progress:** Horizontal sequence of numbered circles
- **Section Tabs:** Minimal text tabs for different assembly phases
- **Back/Forward:** Simple arrow buttons

### Image Treatment
- All visuals are line art illustrations
- Isometric or flat perspective
- Consistent line weight (2px for main lines, 1px for details)
- No photographs or realistic images
- Components shown in exploded views

### Distinctive Components
- **Step Number:** Large bold number in circle or square (e.g., "1", "2", "3")
- **Action Arrow:** Thick directional arrow showing movement/assembly direction
- **Stick Figure:** Simple human figure for scale and action demonstration
- **Exploded View:** Components separated along assembly axis
- **Warning Symbol:** Triangle with exclamation mark or red X
- **Part Callout:** Line pointing to component with letter/number label
- **Screw/Fastener Icon:** Simplified icon showing tool/type needed
- **Hand Icon:** Simplified hand showing grip or action
- **Cross-out:** Red X over incorrect action or orientation
- **Zoom Detail:** Circular magnified view of complex connection

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 8px
- Step padding: 32px
- Between steps: 24px divider or page break
- Part list grid gap: 16px
- Illustration margin: 24px from edges

**Grid & Container:**
- Single column for step sequence
- Each step: illustration centered or left-aligned
- Part list: 4-6 column grid
- Maximum width: 800px for readability
- Generous whitespace around illustrations

**Whitespace Philosophy:**
- Clarity requires space—don't crowd illustrations
- Each step gets its own visual territory
- White background lets line art stand out
- Separation between steps prevents confusion

**Border Radius Scale:**
- Sharp: 0px (for most elements)
- Small: 4px (for step number badges)
- Medium: 8px (for warning boxes, panels)
- Circular: 50% (for step numbers, part indicators)

---

## 6. Depth & Elevation

**Elevation Table:**

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow, pure line art | All illustrations, diagrams |
| Raised | 1px border, subtle bg | Step cards, panels |
| Highlight | Colored border accent | Warning boxes, important notes |

**Shadow Philosophy:**
The IKEA Manual style avoids shadows entirely in illustrations—depth is shown through line art techniques (hidden lines as dashed, exploded views). For UI elements like cards or panels, use minimal 1px borders rather than shadows. The aesthetic is flat, clean, and two-dimensional.

---

## 7. Do's and Don'ts

### Do's
- Use simple, clear line drawings
- Number steps sequentially and prominently
- Include arrows for direction and action
- Show exploded views for complex assemblies
- Use stick figures for scale and human reference
- Keep illustrations uncluttered
- Use warning symbols for safety-critical steps
- Show correct AND incorrect examples when needed
- Use consistent perspective throughout
- Include a parts list with quantities

### Don'ts
- Don't use photographs or realistic images
- Don't add unnecessary decorative elements
- Don't use complex text instructions
- Don't crowd multiple actions into one step
- Don't use gradients or shadows in illustrations
- Don't skip step numbers or reorder them
- Don't make line drawings too detailed
- Don't use ambiguous arrows or symbols
- Don't forget to show tool requirements
- Don't use color as the only indicator (accessibility)

---

## 8. Responsive Behavior

**Breakpoints:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single step per screen, swipe navigation |
| Tablet | 640-1024px | 1-2 steps per row, scrollable |
| Desktop | > 1024px | Full step sequence visible, grid layout |

**Touch Targets:**
- Step navigation buttons: 48x48px minimum
- Part list items: 44x44px minimum
- Zoom/detail buttons: 40x40px minimum

**Collapsing Strategy:**
- Steps stack vertically on mobile
- Part list becomes 2-column grid on mobile
- Navigation becomes swipeable on mobile
- Illustrations scale to fit screen width

**Image Behavior:**
- Line art illustrations scale cleanly at any size
- Maintain consistent line weight when scaling
- Step illustrations should fit within viewport
- Zoom functionality for complex details

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Lines: `#1A1A1A` (black) for all drawings
- Backgrounds: `#FFFFFF` (white), `#F5F0E8` (cream)
- Warnings: `#E30613` (red), `#FFCC00` (yellow)
- Highlights: `#0058A3` (blue), `#008A2E` (green)
- Secondary: `#4A4A4A` (dark gray), `#9E9E9E` (medium gray)
- Always use line art, no photos
- Minimal text—visual communication first

### Example Component Prompts

1. **Assembly Step Card:** "Create an assembly instruction step card. White background. Large bold '3' in top-left corner in `#1A1A1A`. Center: line art illustration showing two panels being joined at 90 degrees with a thick action arrow. Small part callout lines pointing to 'A' and 'B' labels. Clean, minimal, uncluttered."

2. **Parts List Panel:** "Design a parts inventory panel with 6 components. Grid layout 3x2. Each item: small line art illustration of part + part letter (A, B, C...) + quantity 'x2'. White background, thin `#E0E0E0` borders between items. Clean sans-serif labels."

3. **Warning Callout:** "Create a warning instruction element. Yellow `#FFCC00` border, cream `#F5F0E8` background. Warning triangle icon in `#E30613` red. Line art illustration showing INCORRECT assembly with red X cross-out. Minimal text: 'Do not overtighten'."

4. **Exploded View Diagram:** "Design an exploded assembly view showing a 4-component object. Components separated along vertical axis with dashed lines showing alignment. Each part labeled A-D. Action arrows showing assembly direction. Isometric perspective. Black lines on white background."

5. **Step Progress Indicator:** "Create a horizontal step progress bar with 5 steps. Each step: circle with number inside. Completed steps filled in `#1A1A1A`, current step in `#0058A3` blue, future steps outlined. Connecting lines between steps. Clean, minimal design."

6. **Tool Requirement Icon:** "Design a tool indicator showing a screwdriver and hex key needed for a step. Simple line art icons in `#1A1A1A`. Small labels beneath each icon. Arranged horizontally with 'Tools needed:' caption. Minimal, clear."

7. **Correct vs Incorrect Panel:** "Create a side-by-side comparison showing correct and incorrect assembly. Left: green checkmark, correct orientation with action arrow. Right: red X, incorrect orientation crossed out. Both in simple line art style on white background."

### Iteration Guide
1. Identify the assembly steps and break into individual actions
2. Create simple line art for each component
3. Add large, clear step numbers
4. Include action arrows showing movement/assembly
5. Add part callouts with letters/numbers
6. Include warning symbols for safety steps
7. Add a parts list with quantities
8. Review for clarity—can someone follow without text?
9. Final check: consistent perspective, clear numbering, uncluttered visuals
