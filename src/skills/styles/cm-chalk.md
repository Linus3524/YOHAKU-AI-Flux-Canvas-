# Chalk Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Playful, educational, nostalgic, and approachable. Inspired by classic classroom chalkboard aesthetics, conveying warmth and informal learning.
- **Emotional Description:** Warm, friendly, inviting, and slightly imperfect. It feels like being in a cozy classroom with a favorite teacher.
- **Key Characteristics:**
  - Sketchy, imperfect hand-drawn lines with chalk texture.
  - Dark chalkboard backgrounds with bright, colorful chalk accents.
  - Soft edges and visible chalk dust effects.
  - Playful doodles, annotations, and educational symbols.
  - Nostalgic, non-intimidating aesthetic.
  - Authentic hand-crafted feel throughout.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary White** | `#F5F5F5` | Primary text, main chalk lines, icons |
| **Primary Yellow** | `#FFE566` | Highlights, stars, important annotations |
| **Primary Pink** | `#FF9999` | Warm accents, corrections, emphasis |
| **Primary Blue** | `#66B3FF` | Info elements, cool accents, diagrams |
| **Primary Green** | `#90EE90` | Success states, nature, positive marks |
| **Primary Orange** | `#FFB366` | Warnings, energetic accents |
| **Secondary White** | `#E8E8E8` | Secondary text, faded chalk lines |
| **Interactive Yellow** | `#FFD700` | Hover states, active highlights |
| **Neutral 400** | `#9CA3AF` | Chalk dust, subtle textures |
| **Neutral 600** | `#718096` | Faded chalk, placeholder text |
| **Surface Blackboard** | `#1A1A1A` | Main page background, classic blackboard |
| **Surface Greenboard** | `#1C2B1C` | Alternative background, green chalkboard |
| **Surface Wood** | `#8B6914` | Optional wooden frame accents |
| **Semantic Success** | `#90EE90` | Success states, checkmarks (green chalk) |
| **Semantic Warning** | `#FFE566` | Warnings (yellow chalk) |
| **Semantic Error** | `#FF9999` | Errors, corrections (pink/red chalk) |
| **Semantic Info** | `#66B3FF` | Informational callouts (blue chalk) |

## 3. Typography Rules

- **Font Family:** A hand-drawn or chalk-style font (e.g., "Caveat", "Patrick Hand", or "Comic Neue") for all text to maintain the authentic chalkboard feel.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Hand-drawn | 48px / 3rem | 400 | 1.2 | 0.02em | Large, playful, imperfect baseline |
| H1 | Hand-drawn | 36px / 2.25rem | 400 | 1.25 | 0.01em | Section titles, slightly messy |
| H2 | Hand-drawn | 28px / 1.75rem | 400 | 1.3 | 0.01em | Sub-section headers |
| H3 | Hand-drawn | 22px / 1.375rem | 400 | 1.4 | 0.005em | Card titles |
| Body | Hand-drawn | 18px / 1.125rem | 400 | 1.6 | 0.005em | Main text, slightly larger for readability |
| Body Small | Hand-drawn | 15px / 0.9375rem | 400 | 1.5 | 0.01em | Captions, annotations |
| Label | Hand-drawn | 13px / 0.8125rem | 400 | 1.4 | 0.02em | Tags, badges, chalk labels |
| Button | Hand-drawn | 18px / 1.125rem | 400 | 1 | 0.01em | Playful and clickable |
| Annotation | Hand-drawn | 14px / 0.875rem | 400 | 1.4 | 0.02em | Margin notes, corrections |

- **Principles:** Embrace imperfection. The baseline should be slightly irregular. Text should look like it was written by hand with chalk. Use color variety to create visual hierarchy.

## 4. Component Stylings

### Buttons
- **Primary:** Transparent background, 2px dashed Chalk White `#F5F5F5` border, white text, 8px border-radius, chalk texture.
- **Secondary:** Transparent background, 2px dashed Chalk Yellow `#FFE566` border, yellow text, 8px border-radius.
- **Accent:** Transparent background, 2px dashed Chalk Blue `#66B3FF` border, blue text, 8px border-radius.
- **Ghost:** No border, chalk text with underline on hover.

### Cards & Containers
- **Card:** Transparent background, 2px solid Chalk White `#F5F5F5` border with chalk texture, 8px border-radius, subtle chalk dust overlay.
- **Panel:** Transparent background, 1px dashed Neutral 400 border, 8px border-radius.
- **Math Box:** Transparent background, 2px solid Chalk White border, 0px border-radius (like a drawn rectangle).

### Inputs & Forms
- **Text Input:** Transparent background, 2px dashed Chalk White `#F5F5F5` border, 8px border-radius, white text.
- **Focus State:** Border becomes solid, adds a subtle chalk glow effect.
- **Checkbox/Radio:** Hand-drawn square/circle, chalk border, chalk fill when checked.

### Navigation
- **Nav Bar:** Transparent background, 2px solid Chalk White bottom border with chalk texture.
- **Nav Item:** Hand-drawn text in Chalk White, hover adds a chalk underline.
- **Active Nav Item:** Chalk Yellow `#FFE566` text with a small chalk star or underline.

### Image Treatment
- Images should have a hand-drawn frame (like a sketched rectangle around them).
- Optional chalk dust overlay.
- Images can be slightly desaturated to fit the chalkboard aesthetic.

### Distinctive Components
- **Doodle Arrow:** Hand-drawn arrow in chalk white or yellow, used for pointing and emphasis.
- **Chalk Star:** A hand-drawn star for highlighting important items.
- **Underline:** A wavy or straight hand-drawn underline for emphasis.
- **Math Formula:** Chalk-style mathematical symbols and formulas as decorative elements.
- **Eraser Smudge:** A subtle smudge effect used as a decorative background element.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px.
- **Grid & Container:**
  - Max container width: 1100px.
  - 12-column grid with 24px gutters.
  - Layouts can be slightly irregular, not perfectly aligned.
- **Whitespace Philosophy:** Open and breathable, like a well-organized chalkboard. Whitespace is the dark background showing through, creating natural separation. Avoid over-cluttering.
- **Border Radius Scale:**
  - Small: 4px (small annotations)
  - Medium: 8px (cards, buttons, inputs)
  - Large: 12px (modals, large containers)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat on blackboard | Base layer |
| 1 | Slightly brighter chalk color | Hover on items |
| 2 | Chalk dust particle effect around element | Active/focused elements |
| 3 | Layered chalk strokes | Emphasis, special callouts |

- **Shadow Philosophy:** Elevation is achieved through chalk dust effects and brighter chalk colors rather than traditional shadows. There are no drop shadows. Depth comes from the texture and layering of chalk strokes.

## 7. Do's and Don'ts

- **DO:**
  - Use imperfect, hand-drawn lines and shapes.
  - Apply chalk texture to all strokes and text.
  - Use a dark background (blackboard or greenboard) as the base.
  - Add subtle chalk dust and smudge effects.
  - Create visual hierarchy with a variety of chalk colors.
  - Include playful doodles, arrows, and annotations.
- **DON'T:**
  - Use perfect geometric shapes or clean digital lines.
  - Apply gradients, glossy effects, or modern shadows.
  - Use a light/white background (it breaks the chalkboard illusion).
  - Add photorealistic elements without a chalk treatment.
  - Use standard, non-hand-drawn fonts.
  - Create overly neat and tidy layouts.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, panels stack, nav collapses to a simple chalk-drawn menu |
| Tablet | 640px - 1024px | 2-column grid, side panels become overlays |
| Desktop | > 1024px | Full multi-column grid, organized chalkboard layout |

- **Touch Targets:** Minimum 48x48px for all interactive elements.
- **Collapsing Strategy:** Chalk panels stack vertically. Navigation collapses into a simple, hand-drawn menu icon.
- **Image Behavior:** Images maintain aspect ratio, hand-drawn frames scale down. Chalk dust overlays remain subtle at all sizes.

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#1A1A1A` (Blackboard), `#1C2B1C` (Greenboard)
- Primary Text: `#F5F5F5` (White Chalk)
- Accents: `#FFE566` (Yellow), `#FF9999` (Pink), `#66B3FF` (Blue), `#90EE90` (Green), `#FFB366` (Orange)
- Faded: `#9CA3AF` (Chalk Dust), `#718096` (Faded Chalk)

### Example Component Prompts

1. **Chalkboard Button:** "Create a button with a transparent background, a 2px dashed Chalk White `#F5F5F5` border with chalk texture, white hand-drawn text, and 8px border-radius. Hover state should change the border to solid and add a subtle chalk dust glow."
2. **Math Formula Card:** "Design a card with a transparent background, a 2px solid Chalk White border drawn like a hand-sketched rectangle, and internal padding. Add a small chalk-drawn star in the corner."
3. **Chalk Navigation:** "Create a navigation bar with a transparent background and a 2px solid Chalk White bottom border. Nav items should be hand-drawn text. Active item should be Chalk Yellow `#FFE566` with a small chalk underline."
4. **Doodle Highlight:** "Create a highlight component that looks like a hand-drawn yellow chalk circle around text. Use Chalk Yellow `#FFE566` with an imperfect, sketchy stroke."
5. **Chalk Input Field:** "Design a text input with a transparent background, a 2px dashed Chalk White border, 8px border-radius, and white hand-drawn text. Focus state should make the border solid."
6. **Annotation Badge:** "Create a small badge that looks like a margin note. Hand-drawn text in Chalk Pink `#FF9999`, with a small arrow pointing to the relevant content."

### Iteration Guide
1. **Start Dark:** Always begin with a dark chalkboard background (`#1A1A1A` or `#1C2B1C`).
2. **Add Chalk Lines:** Draw all borders and text with chalk-colored strokes. Use dashed or imperfect lines.
3. **Texture Layer:** Add chalk dust and smudge effects to strokes and backgrounds.
4. **Color Hierarchy:** Introduce colored chalk (yellow, pink, blue, green) for emphasis and visual hierarchy.
5. **Doodle Polish:** Add playful doodles (stars, arrows, underlines) to key elements. Keep it authentic and hand-drawn.
