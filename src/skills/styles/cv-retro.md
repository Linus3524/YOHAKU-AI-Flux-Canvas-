# Retro — Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Nostalgic, vintage, classic — timeless charm with character
- **Emotional Description:** Warm familiarity and crafted authenticity; evokes vinyl records, vintage posters, and classic typography
- **Key Characteristics:**
  - Muted, slightly desaturated colors with vintage warmth
  - Halftone patterns and aged textures
  - Classic typography with serif and script pairings
  - Sunburst radiating lines and vintage badges
  - Aged paper textures and subtle grain

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Coral Red | #E07A5F | Primary buttons, highlights, retro accents |
| **Secondary** | Mint Green | #81B29A | Secondary actions, nature elements, balance |
| **Tertiary** | Mustard Yellow | #F2CC8F | Warnings, badges, vintage highlights |
| **Quaternary** | Dark Maroon | #5D3A3A | Deep text, strong emphasis, vintage dark |
| **Background** | Cream Off-White | #F5F0E6 | Main page background |
| **Background Alt** | Aged Paper | #F5E6D3 | Cards, panels, vintage surfaces |
| **Accent 1** | Burnt Orange | #D4764A | Warm accents, CTAs |
| **Accent 2** | Rock Blue | #577590 | Cool balance, info elements |
| **Accent 3** | Vintage Gold | #C9A227 | Premium vintage highlights, badges |
| **Accent 4** | Faded Teal | #2F7373 | Decorative accents, complementary |
| **Text Primary** | Dark Brown | #3D2B1F | Headings, primary text |
| **Text Secondary** | Warm Gray | #6B5B4F | Body text, captions |
| **Border** | Tan | #C4A882 | Dividers, vintage borders |
| **Semantic Success** | Mint | #81B29A | Success states |
| **Semantic Error** | Coral | #E07A5F | Error states |
| **Semantic Warning** | Mustard | #F2CC8F | Warning states |

---

## 3. Typography Rules

**Font Family:**
- **Primary:** "Libre Baskerville" or "Merriweather" — classic serif
- **Headings:** "Abril Fatface" or "Playfair Display" — bold, vintage display
- **Accent:** "Pacifico" or "Lobster" — script for decorative moments
- **Label:** "Oswald" or "Bebas Neue" — condensed, vintage poster style

**Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Abril Fatface | 52px / 3.25rem | 400 | 1.1 | 0.01em | Hero headlines, vintage poster |
| H1 | Abril Fatface | 40px / 2.5rem | 400 | 1.15 | 0.01em | Page titles |
| H2 | Abril Fatface | 32px / 2rem | 400 | 1.2 | 0 | Section headers |
| H3 | Libre Baskerville | 24px / 1.5rem | 700 | 1.3 | 0 | Card titles |
| H4 | Libre Baskerville | 20px / 1.25rem | 700 | 1.4 | 0 | Subsection |
| Body | Libre Baskerville | 16px / 1rem | 400 | 1.7 | 0.01em | Main text |
| Body Small | Libre Baskerville | 14px / 0.875rem | 400 | 1.6 | 0.01em | Captions |
| Label | Oswald | 12px / 0.75rem | 500 | 1.4 | 0.08em | Uppercase, wide tracking |
| Script | Pacifico | 24px / 1.5rem | 400 | 1.3 | 0 | Decorative accents |
| Button | Oswald | 14px / 0.875rem | 500 | 1 | 0.05em | Uppercase buttons |

**Principles:**
- Serif fonts dominate for vintage authenticity
- Condensed sans-serif (Oswald) for labels and buttons — poster style
- Script font used sparingly for decorative quotes
- Slightly wider line-height for classic reading comfort

---

## 4. Component Stylings

### Buttons
- **Primary:** Background #E07A5F, text white, border-radius 4px, padding 12px 28px, Oswald uppercase
- **Secondary:** Background #81B29A, text white
- **Vintage:** Background #C9A227, text #3D2B1F
- **Outline:** Transparent, border 2px solid #E07A5F, text #E07A5F
- **Hover:** Slight darken, subtle vintage texture overlay

### Cards & Containers
- Background: #F5E6D3 or #F5F0E6
- Border-radius: 4px (subtle vintage angle)
- Border: 2px solid #C4A882 (vintage frame feel)
- Shadow: 0 4px 12px rgba(61,43,31,0.1)
- Padding: 28px
- Optional: Subtle paper grain texture overlay

### Inputs & Forms
- Background: #F5F0E6
- Border: 2px solid #C4A882
- Border-radius: 4px
- Focus: Border #E07A5F
- Placeholder: #A08B7A

### Navigation
- Background: #F5F0E6 with subtle texture
- Links: Oswald uppercase, 14px, letter-spacing 0.05em
- Active: Coral red underline
- Hover: Mustard yellow background tint
- Logo: Script or bold serif

### Image Treatment
- Warm, slightly desaturated photography
- Optional sepia or vintage filter
- Rounded corners (subtle, 4px)
- Vintage frame borders
- Halftone dot patterns as overlays

### Distinctive Components
- **Vintage Badge:** Circular or shield shape, textured background, script text
- **Sunburst Element:** Radiating lines from center, mustard or coral
- **Halftone Divider:** Pattern of dots transitioning from dense to sparse
- **Aged Quote Block:** Cream background, serif italic, decorative quotation marks

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

### Grid & Container
- Max container width: 1200px
- Grid: 12-column, gutter 24px
- Page padding: 24px (mobile), 48px (desktop)

### Whitespace Philosophy
- Generous but structured — vintage design values craftsmanship
- Section vertical spacing: 64–96px
- Symmetrical layouts for classic feel
- Room for decorative vintage elements

### Border Radius Scale
- sm: 2px
- md: 4px (buttons, inputs, cards)
- lg: 8px (modals, larger containers)
- full: 9999px (badges, pills)

---

## 6. Depth & Elevation

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat with texture | Base vintage layout |
| 1 | 0 2px 6px rgba(61,43,31,0.08) | Cards at rest |
| 2 | 0 4px 12px rgba(61,43,31,0.1) | Hover cards |
| 3 | 0 8px 24px rgba(61,43,31,0.12) | Modals |

**Shadow Philosophy:** Shadows are warm-toned (brown undertones) and subtle. Elevation is secondary to texture and border treatment. The vintage aesthetic values physical materiality — paper, ink, texture — over digital depth.

---

## 7. Do's and Don'ts

**Do:**
- Use serif fonts for authentic vintage feel
- Include subtle textures (paper grain, halftone)
- Use vintage color palette with muted saturation
- Employ symmetrical, centered compositions
- Add vintage decorative elements (badges, sunbursts, frames)
- Use photography with warm, slightly desaturated tones

**Don't:**
- Use modern sans-serif fonts as primary type
- Use bright, saturated neon colors
- Create flat, textureless designs
- Use overly rounded corners — vintage prefers subtle angles
- Use modern minimalist layouts without character
- Forget the aged, crafted feeling

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, maintained vintage feel |
| Tablet | 640–1024px | 2 columns |
| Desktop | > 1024px | Full grid, vintage decorations visible |

**Touch Targets:** Minimum 44x44px

**Collapsing Strategy:**
- Navigation collapses to vintage-styled hamburger
- Cards stack vertically
- Decorative elements may simplify on small screens
- Typography maintains vintage proportions

**Image Behavior:**
- Vintage photos: maintain warm filter
- Decorative elements: scale proportionally
- Frames and borders: maintain on all sizes

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: #E07A5F (Coral Red)
- Secondary: #81B29A (Mint Green)
- Background: #F5F0E6 (Cream Off-White)
- Accent: #C9A227 (Vintage Gold)
- Text: #3D2B1F (Dark Brown)
- Dark: #5D3A3A (Dark Maroon)

### Example Component Prompts

1. **Vintage Hero Section:** "Create a hero section with cream background, large Abril Fatface headline in dark brown, coral red CTA button with Oswald uppercase text, and a vintage sunburst decoration in mustard yellow."

2. **Retro Product Card:** "Design a product card with aged paper background, 4px border-radius, tan border, vintage gold 'Premium' badge, Libre Baskerville product name, and coral red price."

3. **Vintage Newsletter Form:** "Build a newsletter signup with cream input background, tan border, coral red focus state, and a vintage gold submit button with Oswald uppercase text."

4. **Classic Navigation:** "Create a navigation bar with cream background, Oswald uppercase links in dark brown, coral red active underline, and a script font logo."

5. **Aged Quote Block:** "Design a testimonial with aged paper background, Libre Baskerville italic text, large decorative quotation marks in coral red, and attribution in small caps."

6. **Retro Feature Grid:** "Build a 3-column feature grid with cream cards, vintage-colored icons (coral, mint, mustard), Abril Fatface headings, and Libre Baskerville body text."

### Iteration Guide
1. Start with cream off-white background and dark brown text
2. Add Abril Fatface or similar vintage display font for headings
3. Use Libre Baskerville for body text
4. Introduce coral red for primary actions
5. Add mint green for secondary elements and balance
6. Use vintage gold sparingly for premium accents
7. Add subtle textures (paper grain, halftone dots)
8. Include vintage decorative elements (badges, sunbursts, frames)
9. Ensure all colors are slightly muted — avoid modern saturation
