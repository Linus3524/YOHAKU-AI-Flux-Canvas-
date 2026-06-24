# Bold Editorial

High-impact magazine editorial style with bold visual expression and commanding presence.

---

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Confident, daring, premium, and unapologetically bold
- **Emotional Description:** Every slide feels like a high-end magazine cover — commanding attention through scale, contrast, and restraint
- **Key Characteristics:**
  - Extreme scale contrast between headlines and body text
  - Full-bleed imagery or solid color backgrounds
  - Typography treated as a primary visual element
  - Minimal decoration; content is the design
  - High-stakes, premium, editorial authority
  - Dynamic compositions with diagonal lines and angles

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Deep Black | #0A0A0A | Primary dark background |
| **Secondary** | Deep Blue | #0F172A | Alternative dark background |
| **Surface Light** | Pure White | #FFFFFF | Light mode background |
| **Primary Text** | Pure White | #FFFFFF | Text on dark backgrounds |
| **Secondary Text** | Pure Black | #000000 | Text on light backgrounds |
| **Accent 1** | Electric Blue | #3B82F6 | Primary highlights, CTAs |
| **Accent 2** | Bright Orange | #FB923C | Energy, urgency, calls to action |
| **Accent 3** | Magenta | #EC4899 | Creative accents, bold statements |
| **Accent 4** | Neon Green | #22C55E | Success, growth indicators |
| **Accent 5** | Violet | #8B5CF6 | Innovation, premium elements |

**Color Philosophy:** High-contrast, saturated accents against deep neutral backgrounds. No muted or pastel tones. Every color choice must command attention.

---

## 3. Typography Rules

**Font Family:**
- **Headlines:** Bold condensed typeface (Impact, Oswald Bold, Bebas Neue)
- **Body:** Clean sans-serif (Inter, SF Pro, Helvetica Neue)

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero Headline | Condensed Display | 72-120px | 700-900 | 0.9 | -0.02em | All-caps, dominates the slide |
| Section Title | Condensed Display | 48-64px | 700 | 1.0 | -0.01em | All-caps |
| Subhead | Sans-serif | 24-32px | 600 | 1.2 | 0 | Sentence case |
| Body | Sans-serif | 16-18px | 400-500 | 1.6 | 0 | Comfortable reading |
| Caption | Sans-serif | 12-14px | 400 | 1.4 | 0.02em | Metadata, labels |
| Pull Quote | Condensed Display | 32-40px | 700 | 1.1 | -0.01em | All-caps, accent color |

**Principles:**
- Oversized headlines that dominate the composition
- All-caps for headlines with tight letter-spacing
- Extreme scale contrast between headline and body
- Let negative space create visual tension

---

## 4. Component Stylings

### Buttons
- **Primary:** Solid accent color background (#3B82F6), white text, no border-radius, padding 16px 32px, all-caps condensed font
- **Secondary:** Transparent with 2px white border, white text, no border-radius
- **Ghost:** No background, accent color text, underline on hover

### Cards & Containers
- Full-bleed backgrounds with no border-radius
- Bold color blocks as section dividers
- Minimal padding (24-32px)
- No shadows — rely on color contrast for separation

### Inputs & Forms
- Bottom-border only style on dark backgrounds
- White border-bottom 2px, transparent background
- White placeholder text at 50% opacity
- Focus: accent color border-bottom

### Navigation
- Minimal top bar, transparent or matching background
- All-caps condensed font for nav items
- Active state: accent color underline

### Image Treatment
- Full-bleed images with no border-radius
- Optional subtle gradient overlay for text readability
- Images treated as background layers

### Distinctive Components
- **Color Block:** Large geometric color blocks as section backgrounds
- **Pull Quote:** Oversized quote text in accent color, full-width
- **Stat Block:** Giant number + small label, extreme scale contrast

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 8px
- Section padding: 64-96px vertical
- Content max-width: 1200px (centered) or full-bleed
- Tight internal spacing within content blocks

**Grid & Container:**
- 12-column grid for complex layouts
- Asymmetric compositions preferred
- Full-bleed sections alternating with contained sections

**Whitespace Philosophy:**
- Strategic negative space creates tension and focus
- Large gaps between headline and body text
- Let one element dominate; everything else recedes

**Border Radius Scale:**
- Default: 0px (sharp, editorial edges)
- Exception: Small 4px radius for subtle UI elements only

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat, no shadow | Default state, editorial flatness |
| 1 | Subtle text shadow | Headlines on image backgrounds |
| 2 | Gradient overlay | Image overlays for text readability |
| 3 | Color block lift | Accent blocks floating over dark bg |

**Shadow Philosophy:** Avoid traditional box shadows. Create depth through color contrast, scale, and layering rather than drop shadows. If shadows are needed, use colored shadows (e.g., magenta glow at 20% opacity) for dramatic effect.

---

## 7. Do's and Don'ts

### Do
- Use extreme scale contrast (huge headlines, small body)
- Create bold color block compositions
- Let negative space create tension
- Use full-bleed backgrounds
- Make every slide feel like a magazine cover
- Use all-caps condensed headlines
- Keep decoration minimal

### Don't
- Use soft or muted colors
- Add unnecessary decorative elements
- Create busy, cluttered layouts
- Use thin or delicate typography
- Add slide numbers, footers, or logos
- Use rounded corners on major containers
- Create symmetrical, balanced layouts (asymmetry is key)

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, headline scales to 48px, full-bleed images stack |
| Tablet | 640-1024px | 2-column grid, headline 64px, maintained asymmetry |
| Desktop | > 1024px | Full layout, headline 96-120px, full-bleed sections |

**Touch Targets:** Minimum 48px for interactive elements

**Collapsing Strategy:**
- Side-by-side layouts stack vertically
- Headlines maintain proportional scale
- Color blocks remain full-width

**Image Behavior:**
- Full-bleed images become contained on mobile
- Maintain aspect ratio, crop as needed
- Gradient overlays intensify on smaller screens for readability

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: #0A0A0A (Deep Black) or #FFFFFF (Pure White)
- Primary Text: #FFFFFF (on dark) / #000000 (on light)
- Accent: #3B82F6 (Electric Blue), #FB923C (Orange), #EC4899 (Magenta)

### Example Component Prompts

1. **Hero Slide:** "Create a full-bleed dark background (#0A0A0A) with an oversized all-caps headline in condensed bold font. Add a single electric blue (#3B82F6) color block in the lower third. Body text in white, minimal, left-aligned."

2. **Stat Highlight:** "Design a split layout: left side pure black with a giant number (120px, white), right side electric blue (#3B82F6) with supporting text in white. No border-radius."

3. **Pull Quote Block:** "Full-width section with deep blue (#0F172A) background. Centered pull quote in magenta (#EC4899), 40px condensed font, all-caps. Attribution below in white, smaller size."

4. **Image + Text Overlay:** "Full-bleed background image with subtle dark gradient overlay. Large headline in white, bottom-left aligned. Small body text below, 16px. No cards, no borders."

5. **Color Block Grid:** "Asymmetric grid layout with alternating black and bright orange (#FB923C) blocks. White text on dark blocks, black text on orange blocks. Bold condensed headlines."

6. **Feature List:** "Dark background with 3 vertical sections separated by thin white lines. Each section has a large number (01, 02, 03) in violet (#8B5CF6) and a short headline in white."

### Iteration Guide

1. **Start bold:** Begin with the most extreme version — oversized type, high contrast, full-bleed. Then refine if needed.
2. **One dominant element:** Every slide should have ONE element that commands attention. Remove competing elements.
3. **Color as structure:** Use color blocks to define layout regions, not just as decoration.
4. **Typography first:** Design the type hierarchy before adding any other visual elements.
5. **Negative space is active:** Empty space should feel intentional, not accidental. Use it to create tension.
6. **Check contrast:** Ensure all text meets WCAG AA against its background. If not, adjust the background or add an overlay.
