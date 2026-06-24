# Elegant — Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Sophisticated, refined, understated luxury — quiet confidence
- **Emotional Description:** Timeless elegance that whispers rather than shouts; evokes fine stationery, boutique hotels, and gallery openings
- **Key Characteristics:**
  - Muted, desaturated palette with selective gold accents
  - Delicate ornamental details and refined patterns
  - Symmetrical, balanced compositions with classical proportions
  - Subtle gradients and soft transitions between tones
  - Premium materials aesthetic: silk, marble, brushed metal

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Soft Coral | #E8A598 | Primary buttons, active links, key highlights |
| **Secondary** | Muted Teal | #5B8A8A | Secondary actions, icons, complementary elements |
| **Tertiary** | Dusty Rose | #D4A5A5 | Decorative accents, tags, subtle backgrounds |
| **Background** | Warm Cream | #F5F0E6 | Main page background |
| **Background Alt** | Soft Beige | #F0EBE0 | Cards, panels, elevated surfaces |
| **Accent 1** | Gold | #C9A962 | Premium highlights, badges, decorative lines, icons |
| **Accent 2** | Copper | #B87333 | Warm metallic accents, borders, hover states |
| **Surface** | Pearl White | #FAF8F5 | Modals, dropdowns, input backgrounds |
| **Text Primary** | Charcoal | #3D3D3D | Headings, body text |
| **Text Secondary** | Warm Gray | #7A7A7A | Captions, metadata, placeholders |
| **Border** | Champagne | #E0D5C5 | Dividers, input borders, card outlines |
| **Semantic Success** | Sage | #8FAE8F | Success states |
| **Semantic Error** | Dusty Red | #C97B7B | Error states |

---

## 3. Typography Rules

**Font Family:**
- **Primary:** "Cormorant Garamond" or "Playfair Display" — elegant serif for headings
- **Body:** "Lato" or "Source Sans Pro" — clean sans-serif for readability
- **Accent:** "Cormorant Garamond Italic" — for quotes and decorative text

**Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Playfair Display | 56px / 3.5rem | 700 | 1.1 | -0.02em | Hero headlines, editorial |
| H1 | Playfair Display | 40px / 2.5rem | 700 | 1.2 | -0.01em | Page titles |
| H2 | Playfair Display | 32px / 2rem | 600 | 1.25 | 0 | Section headers |
| H3 | Playfair Display | 24px / 1.5rem | 600 | 1.3 | 0 | Card titles |
| H4 | Playfair Display | 20px / 1.25rem | 600 | 1.4 | 0.01em | Subsection |
| Body | Lato | 16px / 1rem | 400 | 1.7 | 0.01em | Main text |
| Body Small | Lato | 14px / 0.875rem | 400 | 1.6 | 0.01em | Captions, metadata |
| Label | Lato | 11px / 0.6875rem | 600 | 1.4 | 0.1em | Uppercase labels, tracking wide |
| Button | Lato | 14px / 0.875rem | 600 | 1 | 0.08em | Uppercase, wide tracking |
| Quote | Playfair Display Italic | 22px / 1.375rem | 400 | 1.5 | 0 | Pull quotes |

**Principles:**
- Headings in Charcoal (#3D3D3D); never pure black
- Body in Warm Gray (#7A7A7A) for softer reading experience
- Elegant uppercase labels with wide letter-spacing for navigation and categories
- Serif/sans-serif pairing creates refined contrast

---

## 4. Component Stylings

### Buttons
- **Primary:** Background #E8A598, text white, border-radius 4px, padding 14px 32px, letter-spacing 0.08em, uppercase
- **Secondary:** Background transparent, border 1px solid #5B8A8A, text #5B8A8A
- **Premium:** Background #C9A962, text #3D3D3D, subtle metallic sheen
- **Hover:** Background darkens 8%, subtle scale 1.01

### Cards & Containers
- Background: #F0EBE0 or #FAF8F5
- Border-radius: 4px (subtle, refined)
- Border: 1px solid #E0D5C5
- Shadow: none or 0 2px 8px rgba(61,61,61,0.04)
- Padding: 32px
- Optional: thin gold top border (2px #C9A962) for premium cards

### Inputs & Forms
- Background: #FAF8F5
- Border: 1px solid #E0D5C5
- Border-radius: 4px
- Focus: Border #C9A962, subtle gold glow
- Placeholder: #B8B0A4

### Navigation
- Background: transparent or #F5F0E6
- Links: Lato uppercase, 12px, letter-spacing 0.1em
- Active: Gold underline (#C9A962, 2px)
- Hover: Text color transitions to #C9A962

### Image Treatment
- Soft, muted color grading
- Subtle vignette on editorial images
- Thin gold frame overlay option (1px #C9A962)
- Black and white photography with warm tint works exceptionally well

### Distinctive Components
- **Ornamental Divider:** Thin line (#E0D5C5) with small gold diamond in center
- **Premium Badge:** Gold background (#C9A962), charcoal text, 4px radius, uppercase
- **Quote Block:** Left border 2px gold, Playfair Display Italic, cream background
- **Editorial Caption:** Small caps, wide tracking, warm gray

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
- Max container width: 1280px (generous for editorial layouts)
- Grid: 12-column, gutter 32px
- Page padding: 32px (mobile), 64px (desktop)

### Whitespace Philosophy
- Abundant whitespace signals luxury and refinement
- Section vertical spacing: 80–120px
- Asymmetrical layouts balanced by generous margins
- Single-column editorial layouts with wide gutters

### Border Radius Scale
- sm: 2px (subtle elements)
- md: 4px (buttons, inputs, cards)
- lg: 8px (modals, larger containers)
- full: 9999px (rarely used — elegance prefers angles)

---

## 6. Depth & Elevation

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat, no shadow | Base editorial layout |
| 1 | 0 1px 3px rgba(61,61,61,0.04) | Subtle card lift |
| 2 | 0 2px 8px rgba(61,61,61,0.06) | Dropdowns, menus |
| 3 | 0 4px 16px rgba(61,61,61,0.08) | Modals |

**Shadow Philosophy:** Shadows are extremely subtle — almost imperceptible. Elevation is communicated more through borders, spacing, and the champagne/gold accent hierarchy than through shadow depth. The aesthetic is flat-luxury.

---

## 7. Do's and Don'ts

**Do:**
- Use serif fonts for headings to convey sophistication
- Employ generous whitespace — elegance needs room
- Add delicate ornamental details (thin lines, small geometric accents)
- Use gold (#C9A962) sparingly — it's a precious accent
- Maintain symmetrical, centered compositions for formal content
- Use high-quality photography with muted, desaturated tones

**Don't:**
- Use bright, saturated colors — they cheapen the aesthetic
- Overcrowd layouts with too many elements
- Use rounded corners larger than 8px — too casual
- Use playful or cartoonish illustrations
- Use pure black or pure white — always soften
- Apply heavy shadows or gradients

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, reduced typography scale, hamburger nav |
| Tablet | 640–1024px | 2 columns, maintained elegance |
| Desktop | > 1024px | Full editorial grid, side navigation, wide margins |

**Touch Targets:** Minimum 44x44px

**Collapsing Strategy:**
- Navigation collapses to elegant hamburger with gold accent
- Multi-column editorial grids stack to single column
- Display type scales down ~25% on mobile
- Ornamental dividers may hide on very small screens

**Image Behavior:**
- Editorial images: full-bleed on mobile, contained on desktop
- Maintain aspect ratios — never stretch

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: #E8A598 (Soft Coral)
- Secondary: #5B8A8A (Muted Teal)
- Background: #F5F0E6 (Warm Cream)
- Premium Accent: #C9A962 (Gold)
- Text: #3D3D3D (Charcoal)

### Example Component Prompts

1. **Elegant Hero Section:** "Create an editorial hero section with warm cream background, large Playfair Display headline in charcoal, thin gold decorative line beneath, soft coral CTA button with uppercase Lato text and wide tracking. Include a refined, muted photograph."

2. **Premium Pricing Card:** "Design a pricing card with soft beige background, thin gold top border, Playfair Display heading, Lato feature list with muted teal checkmarks, and a soft coral primary button. Add subtle champagne border."

3. **Editorial Quote Block:** "Build a testimonial quote with left gold accent border, Playfair Display Italic text in charcoal, attribution in small caps Lato with wide tracking, on cream background."

4. **Refined Navigation:** "Create a transparent navigation bar with uppercase Lato links (12px, 0.1em tracking), gold underline on active state, and a soft coral 'Contact' button with 4px radius."

5. **Elegant Form:** "Design a contact form with pearl white inputs, champagne borders, gold focus state, Playfair Display section heading, and soft coral submit button. Labels in uppercase small caps."

6. **Ornamental Divider:** "Create a horizontal divider component with a thin champagne line and a small rotated square (diamond) in gold at the center."

### Iteration Guide
1. Start with warm cream background and charcoal text
2. Add Playfair Display headings for instant elegance
3. Introduce soft coral for primary actions (restrained use)
4. Add muted teal for secondary elements and balance
5. Apply gold (#C9A962) only to decorative accents, never large surfaces
6. Ensure all corners are subtle (4px max) — sharpness conveys refinement
7. Add whitespace generously — test by removing elements, not adding
8. Verify typography contrast meets WCAG AA
