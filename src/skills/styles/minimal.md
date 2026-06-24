# Minimal Design System

Ultra-clean keynote style with maximum whitespace and zen-like simplicity.

---

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Refined, confident, premium, contemplative
- **Emotional Tone:** Calm, focused, sophisticated, uncluttered
- **Key Characteristics:**
  - Maximum whitespace with minimal elements — every element earns its place
  - Zen-like simplicity where removal continues until nothing more can be taken away
  - Premium, refined aesthetic suitable for executive audiences
  - Less is more — restraint is the defining quality
  - Each element has maximum impact due to surrounding emptiness

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Single Brand Color | #2563EB | One accent only, used sparingly for emphasis |
| **Secondary** | — | — | No secondary accent — maintain restraint |
| **Interactive** | Single Brand Color | #2563EB | Primary actions only |
| **Neutral** | Near Black | #1A1A1A | Headlines, primary text |
| **Neutral Light** | Medium Gray | #6B7280 | Captions, metadata, secondary text |
| **Surface** | Pure White | #FFFFFF | Primary background — absolute clean |
| **Divider** | Light Gray | #E5E7EB | Subtle separators, hairline rules |
| **Semantic** | — | — | Avoid semantic colors — they add visual noise |

**Note:** The accent color is configurable per brand. The example uses blue (#2563EB) but can be any single brand color. The key rule is: only ONE accent color throughout.

---

## 3. Typography Rules

**Font Families:**
- **Headlines:** Clean geometric sans-serif (SF Pro Display, Inter, or Helvetica Neue)
- **Body:** Same family as headlines in lighter weight

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| H1 (Hero Title) | Geometric Sans | 72px | Light (300) | 1.1 | 0.02em | Large scale for impact without boldness |
| H2 (Slide Title) | Geometric Sans | 48px | Light (300) | 1.2 | 0.01em | Generous letter-spacing |
| H3 (Subtitle) | Geometric Sans | 28px | Light (300) | 1.3 | 0.02em | Elegant restraint |
| Body | Geometric Sans | 18px | Regular (400) | 1.6 | 0.01em | Clean, airy feeling |
| Caption | Geometric Sans | 14px | Regular (400) | 1.5 | 0.02em | Minimal size contrast throughout |
| Data / Number | Geometric Sans | 96px | Light (300) | 1.0 | -0.03em | Monumental scale for single numbers |

**Principles:**
- Light to medium weight for elegant restraint — avoid heavy bolds
- Generous letter-spacing on headlines
- Minimal size contrast — hierarchy through scale, not weight variety
- Same font family throughout for absolute cohesion
- Large scale creates impact without needing boldness or color

---

## 4. Component Stylings

### Buttons
- **Primary:** Single brand color background, white text, 0px border-radius (or very subtle 2px)
- **Secondary:** Transparent background, Near Black text, 1px solid Light Gray border
- **Text Link:** Near Black text with subtle underline, no color — or single brand color underline only
- Minimal button styling — buttons should not draw attention unless they are the primary action

### Cards & Containers
- No visible borders or shadows preferred
- If separation is needed: 1px hairline rule in Light Gray (#E5E7EB)
- White on white — cards blend into background
- Maximum 1px border-radius if any

### Inputs & Forms
- 1px Light Gray bottom border only (no full border)
- 0px border-radius
- Near Black text, Medium Gray placeholder
- Focus state: single brand color bottom border (2px)

### Navigation
- Minimal or hidden navigation
- If present: text-only, Near Black, no background
- Active state: single brand color or subtle underline

### Image Treatment
- Full-bleed photography with no borders or effects
- Images in grayscale or monochrome when possible
- No rounded corners on images
- Let photography breathe with generous margins

### Distinctive Components
- **Hairline Rules:** 1px Light Gray lines for subtle separation
- **Monumental Numbers:** Single large numbers (96px+) as focal points
- **Generous Margins:** Minimum 15% whitespace on all sides
- **Single Color Data Viz:** Charts in single accent color or grayscale only
- **Center or Left Alignment:** No center-right or justified text

---

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Margins: minimum 15% on all sides (often 20%+)
- Gap between elements: 32px (small), 64px (medium), 128px (large)
- Section spacing: 96px minimum

### Grid & Container
- Center or left-aligned layouts only
- Generous container padding
- No complex multi-column grids — prefer 1-2 columns maximum
- Elements align to a simple, invisible grid

### Whitespace Philosophy
- **Whitespace is the primary design element**
- Empty space is not absence — it is intentional and active
- Every element must justify its existence
- When in doubt, remove — not add
- Breathing room between elements is more important than the elements themselves

### Border Radius Scale
- 0px for everything
- Absolute sharpness and precision
- No rounded corners — they add visual noise

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 (Flat) | No shadow, no border | Default for all elements |
| 1 (Hairline) | 1px solid Light Gray | Minimal separation when absolutely needed |

**Shadow Philosophy:** Minimalism rejects shadows entirely. Depth is not communicated through elevation — it is communicated through scale, position, and whitespace. The only acceptable "depth" is a 1px hairline rule for rare separation needs. No drop shadows, no glows, no gradients. The design is absolutely flat.

---

## 7. Do's and Don'ts

### Do
- Embrace empty space as the primary design element
- Use a single accent color only — and use it sparingly
- Keep text minimal (10 words or less per slide when possible)
- Create breathing room between elements — generous spacing is mandatory
- Use scale to create hierarchy, not color or weight variety
- Remove elements until nothing more can be taken away
- Center or left-align all content
- Use simple geometric shapes only when absolutely necessary

### Don't
- Fill empty space with decoration, patterns, or textures
- Use multiple accent colors — ever
- Add icons or illustrations unless absolutely essential
- Create dense information layouts
- Add slide numbers, footers, logos, or any non-essential chrome
- Use borders, shadows, or any depth effects
- Apply rounded corners to any element
- Use bold weights — keep it light and elegant
- Add background colors or gradients

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >= 1280px | Full layouts with maximum whitespace, large typography |
| Tablet | 768px - 1279px | Reduced scale, maintained whitespace ratios |
| Mobile | < 768px | Single column, further reduced scale, touch-friendly |

**Touch Targets:** Minimum 44x44px for interactive elements (though minimalism prefers fewer interactive elements)

**Collapsing Strategy:**
- Layouts are already simple — minimal collapsing needed
- Side-by-side elements may stack vertically
- Typography scales down proportionally
- Whitespace ratios maintained

**Image Behavior:**
- Images may become full-width on mobile
- Maintain aspect ratio always
- Generous margins preserved even on small screens

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: #FFFFFF (Pure White)
- Primary Text: #1A1A1A (Near Black)
- Secondary Text: #6B7280 (Medium Gray)
- Accent: #2563EB (Single Brand Color — configurable)
- Dividers: #E5E7EB (Light Gray)

### Example Component Prompts

1. **Hero Title Slide:** "Create a minimal title slide with pure white (#FFFFFF) background. A single large headline in 72px Light weight geometric sans-serif (Near Black #1A1A1A). Generous letter-spacing. Subtitle below in 28px Light weight. Minimum 20% margins on all sides. No other elements."

2. **Single Stat Display:** "Design a slide showing one monumental number (96px, Light weight) in the center. A short label below in 18px Regular. Pure white background. The number may use the single brand accent color if it is the only element on the slide. Nothing else."

3. **Minimal Quote Slide:** "Present a quote in 32px Light weight sans-serif, left-aligned or centered. Attribution below in 14px Medium Gray. A single hairline rule (1px, Light Gray) above or below the quote. Pure white background. Maximum 20 words in the quote."

4. **Two-Column Minimal:** "Create a two-column layout with a single word/phrase in each column. 48px Light weight. Separated by generous whitespace (no visible divider). Pure white background. Near Black text. No other elements."

5. **Image + Caption:** "Full-bleed photograph occupying 70% of the slide. A short caption (max 6 words) in 18px Regular below or overlaid. No borders, no rounded corners, no effects on the image. Pure white surrounding space."

6. **Minimal List:** "A list of 3-5 items. Each item is a single short phrase (max 5 words) in 24px Light weight. Items separated by 48px vertical spacing. No bullets, no numbers, no icons. Left-aligned. Pure white background."

### Iteration Guide
1. Start with a completely blank white canvas
2. Add only the essential content — no decoration
3. Use Light weight typography at large scale
4. Ensure minimum 15% margins on all sides (preferably 20%)
5. Apply the single accent color to at most one element per view
6. Remove any element that doesn't serve a clear communicative purpose
7. Check for visual noise — remove borders, shadows, rounded corners
8. Verify: can anything else be removed? If yes, remove it.
