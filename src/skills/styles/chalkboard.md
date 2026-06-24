# Chalkboard Design System

Black chalkboard background with colorful chalk drawing style.

---

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Warm, approachable, educational, nostalgic
- **Emotional Tone:** Friendly, inviting, playful yet informative
- **Key Characteristics:**
  - Classic classroom chalkboard aesthetic with hand-drawn chalk illustrations
  - Nostalgic educational feel with imperfect, sketchy lines
  - Colorful chalk creates visual hierarchy while maintaining authentic chalkboard experience
  - Imperfect baseline and stroke variation add warmth and authenticity
  - Balances informality with clear information delivery

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Chalk White | #F5F5F5 | Main text, primary outlines, key content |
| **Secondary** | Chalk Yellow | #FFE566 | Highlights, emphasis, important callouts |
| **Interactive** | Chalk Blue | #66B3FF | Links, interactive elements, diagrams |
| **Neutral** | Chalkboard Black | #1A1A1A | Primary background |
| **Neutral Alt** | Green-Black | #1C2B1C | Traditional green board variant |
| **Surface** | Chalkboard Black | #1A1A1A | Primary background with chalk texture |
| **Accent 1** | Chalk Pink | #FF9999 | Secondary highlights, creative elements |
| **Accent 2** | Chalk Green | #90EE90 | Success, nature, positive indicators |
| **Accent 3** | Chalk Orange | #FFB366 | Warnings, energy, attention items |
| **Semantic Success** | Chalk Green | #90EE90 | Positive feedback, correct answers |
| **Semantic Warning** | Chalk Orange | #FFB366 | Cautions, warnings |
| **Semantic Error** | Chalk Pink | #FF9999 | Errors, incorrect answers |

---

## 3. Typography Rules

**Font Families:**
- **Headlines:** Hand-drawn chalk lettering style (e.g., "Cabin Sketch", "Permanent Marker", or custom chalk font)
- **Body:** Neater chalk handwriting style (e.g., "Patrick Hand", "Kalam", or similar)

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| H1 (Slide Title) | Chalk Display | 56px | Bold | 1.2 | 0.02em | Bold, slightly uneven strokes with visible chalk texture |
| H2 (Section Title) | Chalk Display | 40px | Bold | 1.3 | 0.01em | Imperfect baseline adds authenticity |
| H3 (Subsection) | Chalk Display | 28px | Semi-Bold | 1.4 | 0 | White or bright colored chalk |
| Body | Chalk Hand | 20px | Regular | 1.6 | 0.01em | Neater handwriting, readable at smaller sizes |
| Caption / Label | Chalk Hand | 16px | Regular | 1.4 | 0.02em | Thinner strokes than headlines |
| Annotation | Chalk Hand | 14px | Regular | 1.5 | 0 | Doodle-style notes, arrows |

**Principles:**
- Headlines have visible chalk texture and uneven baselines
- Body text maintains legibility while preserving hand-drawn quality
- Color variety in text creates visual hierarchy (white for primary, yellow for emphasis, etc.)
- Natural stroke variation is intentional and desirable

---

## 4. Component Stylings

### Buttons
- **Primary:** Chalk White (#F5F5F5) text with hand-drawn rectangular border, transparent background
- **Secondary:** Chalk Yellow (#FFE566) text with sketchy underline, no border
- **Ghost:** Chalk Blue (#66B3FF) text only, sketchy underline on hover
- All buttons have slightly irregular hand-drawn borders, not perfect rectangles

### Cards & Containers
- Hand-drawn rectangular outlines with slight wobble
- No fill or very subtle chalk dust fill
- Irregular corners (not perfectly rounded, not perfectly sharp)
- Chalk dust effects around edges

### Inputs & Forms
- Hand-drawn rectangular borders
- Chalk White placeholder text
- Focus state: Chalk Yellow underline or border highlight
- Slight sketchy appearance for all form elements

### Navigation
- Horizontal list with hand-drawn separators
- Active item: Chalk Yellow underline or highlight box
- Items separated by small chalk-drawn dots or lines

### Image Treatment
- All illustrations are hand-drawn chalk style
- No photographs — everything rendered as chalk drawings
- Sketchy icons and simple representations
- Stick figures and simple shapes acceptable

### Distinctive Components
- **Chalk Doodles:** Stars, arrows, underlines, circles, checkmarks as decorative accents
- **Mathematical Formulas:** Rendered in chalk style for educational content
- **Eraser Smudges:** Subtle texture effects for authenticity
- **Connection Lines:** Hand-drawn wavy or slightly curved lines
- **Wooden Frame:** Optional traditional chalkboard frame border

---

## 5. Layout Principles

### Spacing System
- Base unit: 8px (but applied with slight irregularity)
- Generous spacing between elements to mimic natural writing space
- Margins: 10-12% on all sides
- Informal, non-rigid spacing that feels naturally written

### Grid & Container
- No strict grid — layouts feel naturally arranged
- Elements positioned with intentional but informal alignment
- Containers have hand-drawn borders with slight irregularities

### Whitespace Philosophy
- Whitespace is part of the chalkboard — the black background is visible and intentional
- Elements breathe with generous spacing
- Empty space mimics a teacher pausing between concepts

### Border Radius Scale
- No perfect geometric corners
- Hand-drawn borders have natural variation
- Slightly rounded or slightly sharp — never perfectly either

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 (Flat) | No shadow, hand-drawn border only | Default elements on chalkboard |
| 1 (Subtle) | Slight chalk dust halo around element | Emphasized items |
| 2 (Textured) | Eraser smudge background | Section backgrounds, highlights |

**Shadow Philosophy:** Chalkboard style does not use digital shadows. Instead, depth and emphasis are created through chalk dust effects, color intensity, and texture. Elements appear "on" the board rather than "above" it. The background texture (scratches, dust, eraser marks) provides the dimensional context.

---

## 7. Do's and Don'ts

### Do
- Maintain authentic chalk texture on all elements
- Use imperfect, hand-drawn quality throughout
- Add subtle chalk dust and smudge effects
- Create visual hierarchy with color variety (white, yellow, pink, blue, green, orange)
- Include playful doodles and annotations
- Use slightly uneven baselines and stroke weights
- Allow natural variation in line quality
- Layer chalk colors for depth (lighter colors on top)

### Don't
- Use perfect geometric shapes or perfectly straight lines
- Create clean digital-looking lines or vectors
- Add photorealistic elements
- Use gradients or glossy effects
- Apply drop shadows or digital elevation
- Use fonts that look typeset or mechanical
- Add slide numbers, footers, or logos
- Make everything perfectly symmetrical

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >= 1280px | Full chalkboard layout, multiple content sections |
| Tablet | 768px - 1279px | Simplified layouts, fewer doodles per section |
| Mobile | < 768px | Single column, larger text, minimal decorative elements |

**Touch Targets:** Minimum 48x48px for interactive elements (slightly larger due to informal style)

**Collapsing Strategy:**
- Side-by-side content stacks vertically
- Complex diagrams simplify to core elements
- Decorative doodles reduce in number on smaller screens

**Image Behavior:**
- Chalk illustrations scale proportionally
- Line weights may appear thicker at smaller sizes
- Text remains legible — prioritize readability over decoration

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: #1A1A1A (Chalkboard Black)
- Primary Text: #F5F5F5 (Chalk White)
- Highlight: #FFE566 (Chalk Yellow)
- Secondary: #FF9999 (Chalk Pink)
- Links/Blue: #66B3FF (Chalk Blue)
- Success: #90EE90 (Chalk Green)
- Warning: #FFB366 (Chalk Orange)

### Example Component Prompts

1. **Chalkboard Title Slide:** "Create a title slide on a chalkboard black (#1A1A1A) background with realistic chalk texture. Title in large Chalk White (#F5F5F5) hand-drawn lettering with visible chalk dust. Add subtle chalk dust particles and faint eraser marks. A small chalk-drawn star doodle in Chalk Yellow (#FFE566) near the title."

2. **Educational Diagram:** "Draw a simple diagram on chalkboard background using Chalk Blue (#66B3FF) for the main structure. Add labels in Chalk White with hand-drawn leader lines. Include a small chalk arrow pointing to a key element. Imperfect, sketchy lines throughout."

3. **Math Formula Display:** "Present a mathematical formula in chalk style. Use Chalk White for the main equation, Chalk Yellow for the result/highlight. Add a hand-drawn rectangular box around the formula. Subtle chalk dust around the text."

4. **Checklist with Doodles:** "Create a checklist on chalkboard background. Each item has a hand-drawn checkbox (empty square in Chalk White). Checked items have a sketchy checkmark in Chalk Green (#90EE90). Items are separated by generous spacing. Add a small doodle underline beneath the list title in Chalk Yellow."

5. **Warning Callout Box:** "Design a warning callout with a hand-drawn rectangular border in Chalk Orange (#FFB366). Warning text in Chalk White with the word 'WARNING' in Chalk Orange. Add a small hand-drawn exclamation mark doodle. Eraser smudge texture in the background of the box."

6. **Step-by-Step Process:** "Illustrate a 3-step process on chalkboard. Each step is a hand-drawn circle with a number inside (Chalk Yellow). Steps connected by sketchy arrows in Chalk White. Step descriptions in neat chalk handwriting below each circle."

### Iteration Guide
1. Start with chalkboard black background and add subtle texture (scratches, dust)
2. Add content in Chalk White as the base layer
3. Apply color accents (yellow for emphasis, blue for diagrams, etc.)
4. Add hand-drawn borders and containers with slight imperfection
5. Layer chalk dust effects around key elements
6. Add doodle decorations (stars, arrows, underlines) sparingly
7. Review for digital precision — introduce slight wobble and variation
8. Ensure text remains legible despite hand-drawn aesthetic
