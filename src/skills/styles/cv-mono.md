# Mono — Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Clean, focused, essential — radical simplicity
- **Emotional Description:** Pure clarity and intentionality; evokes minimalist galleries, zen gardens, and essentialist philosophy
- **Key Characteristics:**
  - Maximum negative space as a design element
  - Stark black-and-white contrast with optional single accent
  - Thin lines and minimal strokes
  - Single focal point per composition
  - Every element earns its place through function

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Pure Black | #000000 | Primary text, headings, key lines |
| **Secondary** | Near Black | #1F1F1F | Secondary text, subtle elements |
| **Tertiary** | Dark Gray | #374151 | Body text, captions |
| **Background** | White | #FFFFFF | Main page background |
| **Background Alt** | Off-White | #FAFAFA | Subtle section differentiation |
| **Accent** | Content-derived | Varies | Single accent color derived from content imagery |
| **Accent 2** | Medium Gray | #9CA3AF | Disabled states, placeholders |
| **Surface** | White | #FFFFFF | Cards, panels (often indistinguishable from background) |
| **Text Primary** | Black | #000000 | Headings, primary content |
| **Text Secondary** | Dark Gray | #374151 | Body text |
| **Text Muted** | Gray | #9CA3AF | Captions, metadata, disabled |
| **Border** | Light Gray | #E5E7EB | Minimal dividers |
| **Semantic Success** | Black | #000000 | Success (checkmark icon) |
| **Semantic Error** | Black | #000000 | Error (X icon) |

---

## 3. Typography Rules

**Font Family:**
- **Primary:** "Inter" or "Helvetica Neue" — neutral, highly legible sans-serif
- **Headings:** "Inter" — same family, weight provides hierarchy
- **Mono:** "JetBrains Mono" — for data, labels, technical content

**Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Inter | 48px / 3rem | 300 | 1.1 | -0.03em | Hero headlines, light weight |
| H1 | Inter | 36px / 2.25rem | 400 | 1.2 | -0.02em | Page titles |
| H2 | Inter | 28px / 1.75rem | 400 | 1.25 | -0.01em | Section headers |
| H3 | Inter | 22px / 1.375rem | 500 | 1.3 | 0 | Card titles |
| H4 | Inter | 18px / 1.125rem | 500 | 1.4 | 0 | Subsection |
| Body | Inter | 16px / 1rem | 400 | 1.6 | 0 | Main text |
| Body Small | Inter | 14px / 0.875rem | 400 | 1.5 | 0 | Captions |
| Label | Inter | 11px / 0.6875rem | 500 | 1.4 | 0.05em | Uppercase labels |
| Mono | JetBrains Mono | 14px / 0.875rem | 400 | 1.5 | 0 | Data, technical |
| Button | Inter | 14px / 0.875rem | 500 | 1 | 0.02em | Minimal buttons |

**Principles:**
- Light weights (300–400) for elegance in minimalism
- Tight letter-spacing on large type
- Mono font for labels, data, and technical elements
- Maximum contrast: black on white, nothing in between

---

## 4. Component Stylings

### Buttons
- **Primary:** Background #000000, text white, border-radius 0px, padding 12px 24px
- **Secondary:** Background transparent, border 1px solid #000000, text #000000
- **Text:** Transparent, text #000000, underline on hover
- **Hover:** Invert colors (black ↔ white) or opacity shift

### Cards & Containers
- Background: #FFFFFF or #FAFAFA
- Border-radius: 0px (sharp, minimal)
- Border: 1px solid #E5E7EB (optional, often absent)
- Shadow: none
- Padding: 32px or more
- Separation through whitespace alone, not borders

### Inputs & Forms
- Background: #FFFFFF
- Border: 1px solid #000000 (bottom only, or full)
- Border-radius: 0px
- Focus: Border thickens to 2px
- Placeholder: #9CA3AF

### Navigation
- Background: transparent or #FFFFFF
- Links: Inter 14px, weight 400
- Active: Black underline
- Hover: Opacity 0.6
- Minimal, often just text links

### Image Treatment
- Black and white photography preferred
- Maximum contrast
- No filters, no overlays
- Full-bleed or precise containment
- Single focal point per image

### Distinctive Components
- **Minimal Divider:** Single 1px black line, full width
- **Data Label:** Mono font, small, gray
- **Focus Indicator:** Simple 2px black outline (no glow, no blur)
- **Icon:** Thin stroke (1px), black, minimal detail

---

## 5. Layout Principles

### Spacing System
Base unit: 8px
- xs: 8px
- sm: 16px
- md: 24px
- lg: 32px
- xl: 48px
- 2xl: 64px
- 3xl: 96px
- 4xl: 128px

### Grid & Container
- Max container width: 1200px (or full-bleed)
- Grid: 12-column, gutter 32px
- Page padding: 32px (mobile), 64px (desktop)

### Whitespace Philosophy
- Whitespace is the primary design element
- Section vertical spacing: 96–160px
- Single-column layouts with extreme margins
- Asymmetry used intentionally for visual interest
- Remove until nothing else can be removed

### Border Radius Scale
- none: 0px (default for most elements)
- sm: 2px (rare)
- All other values avoided

---

## 6. Depth & Elevation

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat, no shadow | Everything |
| 1 | 1px border | Optional card separation |

**Shadow Philosophy:** No shadows. None. Elevation is communicated exclusively through whitespace, borders, and scale. The aesthetic rejects depth simulation in favor of pure, flat honesty.

---

## 7. Do's and Don'ts

**Do:**
- Remove every element that doesn't serve a function
- Use extreme whitespace generously
- Employ black and white photography
- Use thin lines (1px) for separation
- Maintain a single focal point per screen/section
- Use the optional accent color extremely sparingly (one element per page)

**Don't:**
- Use colors beyond black, white, gray, and one optional accent
- Apply shadows, glows, or gradients
- Use rounded corners
- Add decorative elements without function
- Use multiple font families
- Create busy or information-dense layouts

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, maintained minimalism, 24px padding |
| Tablet | 640–1024px | Single or 2 columns |
| Desktop | > 1024px | Full layout, maximum whitespace |

**Touch Targets:** Minimum 44x44px

**Collapsing Strategy:**
- Navigation collapses to minimal hamburger or simple text menu
- Single-column layout maintained across all sizes
- Typography scales down proportionally
- Whitespace reduces but remains generous

**Image Behavior:**
- Images: full-bleed or precisely contained
- Maintain aspect ratios exactly
- No cropping that disturbs the focal point

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: #000000 (Pure Black)
- Background: #FFFFFF (White)
- Text: #000000 (Black)
- Muted: #9CA3AF (Medium Gray)
- Accent: Content-derived single color (use once per page)

### Example Component Prompts

1. **Minimal Hero Section:** "Create a hero section with pure white background, large Inter headline in black (weight 300), thin black underline accent, and a single black CTA button with sharp corners. Maximum whitespace. No other elements."

2. **Essential Card:** "Design a card with white background, no border-radius, no shadow, thin 1px gray border optional. Black heading, dark gray body text, and a text-link CTA. Generous internal padding (32px)."

3. **Minimal Form:** "Build a contact form with white background, bottom-border-only inputs (1px black), no border-radius, black labels in mono font, and a solid black submit button. No placeholders — use labels only."

4. **Pure Navigation:** "Create a top navigation with white background, Inter text links in black, no buttons, no borders. Active state: black underline. Hover: opacity reduction."

5. **Mono Gallery:** "Design an image gallery with full-bleed black and white photos, no gaps between images, no borders, no captions. Pure visual presentation."

6. **Data Display:** "Create a statistics section with large JetBrains Mono numbers in black, small uppercase labels in gray, separated by generous whitespace. No cards, no backgrounds."

### Iteration Guide
1. Start with pure white background and black text
2. Add content in Inter font at light weights
3. Use whitespace as your primary design tool — double what feels comfortable
4. Remove every decorative element
5. If using an accent color, choose ONE and apply to exactly one element
6. Ensure all corners are sharp (0px radius)
7. Remove all shadows and gradients
8. Test by removing elements — if it still works, keep them removed
