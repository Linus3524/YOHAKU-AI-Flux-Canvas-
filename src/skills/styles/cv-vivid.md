# Vivid — Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Energetic, bold, attention-grabbing — unapologetically vibrant
- **Emotional Description:** High energy and excitement; evokes festivals, product launches, and dynamic sports
- **Key Characteristics:**
  - Maximum color saturation with strategic contrast
  - Dynamic diagonal lines and angular compositions
  - Bold geometric shapes and color blocks
  - Dramatic lighting and high-contrast photography
  - Movement and energy in every element

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Bright Red | #EF4444 | Primary CTAs, urgent actions, key highlights |
| **Secondary** | Neon Green | #22C55E | Success, growth indicators, go signals |
| **Tertiary** | Electric Blue | #3B82F6 | Links, info, trust elements |
| **Background** | Light Blue | #EFF6FF | Main page background |
| **Background Alt** | Soft Lavender | #F5F3FF | Alternate sections, cards |
| **Accent 1** | Bright Orange | #FB923C | Warnings, highlights, energy |
| **Accent 2** | Vivid Yellow | #FACC15 | Stars, badges, attention grabbers |
| **Surface** | White | #FFFFFF | Cards, panels, elevated surfaces |
| **Text Primary** | Near Black | #1F1F1F | Headings, primary text |
| **Text Secondary** | Dark Gray | #4B5563 | Body text, captions |
| **Text Muted** | Gray | #9CA3AF | Placeholders, disabled |
| **Border** | Light Gray | #E5E7EB | Dividers, input borders |
| **Semantic Success** | Green | #22C55E | Success states |
| **Semantic Error** | Red | #EF4444 | Error states |
| **Semantic Warning** | Orange | #FB923C | Warning states |

---

## 3. Typography Rules

**Font Family:**
- **Primary:** "Poppins" or "Montserrat" — bold, modern sans-serif
- **Headings:** "Poppins" — strong geometric presence
- **Accent:** "Bebas Neue" or "Oswald" — condensed, impactful for display

**Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Poppins | 64px / 4rem | 800 | 1.05 | -0.03em | Hero headlines, maximum impact |
| H1 | Poppins | 44px / 2.75rem | 700 | 1.1 | -0.02em | Page titles |
| H2 | Poppins | 32px / 2rem | 700 | 1.2 | -0.01em | Section headers |
| H3 | Poppins | 24px / 1.5rem | 600 | 1.25 | 0 | Card titles |
| H4 | Poppins | 20px / 1.25rem | 600 | 1.3 | 0.01em | Subsection |
| Body | Poppins | 16px / 1rem | 400 | 1.6 | 0 | Main text |
| Body Small | Poppins | 14px / 0.875rem | 400 | 1.5 | 0 | Captions |
| Label | Poppins | 12px / 0.75rem | 700 | 1.4 | 0.05em | Uppercase labels |
| Button | Poppins | 16px / 1rem | 700 | 1 | 0.02em | Bold buttons |

**Principles:**
- Bold weights (600–800) for maximum impact
- Tight letter-spacing on large headings
- High contrast between heading and body weights
- Uppercase labels with wide tracking for energy

---

## 4. Component Stylings

### Buttons
- **Primary:** Background #EF4444, text white, border-radius 8px, padding 14px 28px, font-weight 700
- **Secondary:** Background #3B82F6, text white
- **Success:** Background #22C55E, text white
- **Warning:** Background #FB923C, text white
- **Outline:** Transparent, border 2px solid current color
- **Hover:** Scale 1.03, brightness increase, shadow intensifies

### Cards & Containers
- Background: #FFFFFF or #F5F3FF
- Border-radius: 12px
- Border: none or 2px solid transparent
- Shadow: 0 8px 24px rgba(0,0,0,0.12)
- Padding: 24px
- Optional: Colorful left border (4px) or gradient top border

### Inputs & Forms
- Background: #FFFFFF
- Border: 2px solid #E5E7EB
- Border-radius: 8px
- Focus: Border #3B82F6, ring 0 0 0 4px rgba(59,130,246,0.2)
- Placeholder: #9CA3AF

### Navigation
- Background: #FFFFFF or transparent
- Links: Poppins 14px, weight 600
- Active: Bright red underline or background
- Hover: Color shift to primary
- CTA: Bright red button

### Image Treatment
- High contrast, saturated photography
- Dynamic angles and action shots
- Optional color overlays matching palette
- Bold cropping for energy

### Distinctive Components
- **Energy Badge:** Bright color background, white text, bold, uppercase
- **Countdown Timer:** Large numbers, red or orange, ticking animation
- **Announcement Bar:** Full-width, bright yellow or red background
- **Rating Stars:** Vivid yellow, large, prominent

---

## 5. Layout Principles

### Spacing System
Base unit: 4px
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### Grid & Container
- Max container width: 1280px
- Grid: 12-column, gutter 24px
- Page padding: 24px (mobile), 48px (desktop)

### Whitespace Philosophy
- Balanced — vivid colors need room to breathe
- Section vertical spacing: 48–80px
- Use white space to create contrast with bold color blocks
- Dynamic asymmetry for energy

### Border Radius Scale
- sm: 4px (small elements)
- md: 8px (buttons, inputs)
- lg: 12px (cards, panels)
- xl: 16px (large containers)
- full: 9999px (pills, badges)

---

## 6. Depth & Elevation

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat | Base layers |
| 1 | 0 2px 8px rgba(0,0,0,0.1) | Cards at rest |
| 2 | 0 8px 16px rgba(0,0,0,0.12) | Hover cards |
| 3 | 0 12px 32px rgba(0,0,0,0.15) | Modals, popovers |
| 4 | 0 24px 48px rgba(0,0,0,0.2) | Full-screen overlays |

**Shadow Philosophy:** Shadows are bold and noticeable, adding to the energetic feel. Use colored shadows (e.g., red shadow for red buttons) for extra vibrancy. Elevation should feel dynamic, not subtle.

---

## 7. Do's and Don'ts

**Do:**
- Use maximum saturation for primary elements
- Create dynamic, diagonal compositions
- Use bold geometric shapes as design elements
- Employ high-contrast photography with dramatic lighting
- Use large, bold typography
- Create color-blocking sections

**Don't:**
- Use muted or desaturated colors — they kill the energy
- Create static, symmetrical layouts
- Use thin or light font weights for headings
- Overcrowd — vivid colors need space to pop
- Use soft gradients — flat color blocks are more energetic
- Mix too many colors in one small space — max 2–3 per component

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, stacked, bold typography maintained |
| Tablet | 640–1024px | 2 columns, maintained energy |
| Desktop | > 1024px | Full grid, maximum visual impact |

**Touch Targets:** Minimum 48x48px (larger for energetic feel)

**Collapsing Strategy:**
- Navigation collapses to bold hamburger
- Cards stack with full-width color blocks
- Display type scales down minimally — maintain impact
- Announcement bars remain full-width

**Image Behavior:**
- Hero images: full-bleed, high contrast
- Maintain bold cropping across all sizes

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: #EF4444 (Bright Red)
- Secondary: #3B82F6 (Electric Blue)
- Success: #22C55E (Neon Green)
- Background: #EFF6FF (Light Blue)
- Accent: #FACC15 (Vivid Yellow)
- Warning: #FB923C (Bright Orange)

### Example Component Prompts

1. **Launch Hero Section:** "Create a bold hero section with light blue background, massive Poppins headline in near black, bright red CTA button with bold shadow, and dynamic diagonal color blocks (red, blue, green) as decorative elements."

2. **Product Announcement Card:** "Design a product card with white background, colorful top gradient border, bold Poppins product name, bright orange 'New' badge, electric blue price, and vivid yellow star rating."

3. **Event Countdown:** "Build a countdown component with large bold numbers in bright red, small uppercase labels, on a soft lavender background with subtle pulse animation."

4. **Bold Navigation:** "Create a top navigation with white background, bold Poppins links, bright red active indicator, and a large bright red 'Buy Now' CTA button."

5. **Feature Highlight Grid:** "Design a 3-column feature grid with colored cards (red, blue, green backgrounds), white bold headings, and white icons. High contrast, energetic layout."

6. **Announcement Banner:** "Create a full-width banner with bright yellow background, bold black uppercase text, and a bright red 'Learn More' link."

### Iteration Guide
1. Start with light blue or white background
2. Add one vivid primary color for main CTAs (red recommended)
3. Introduce secondary vivid color for balance (blue or green)
4. Use yellow or orange sparingly for badges and highlights
5. Ensure bold typography with strong weight contrast
6. Add dynamic angles or diagonal elements for energy
7. Test color contrast — vivid palettes must remain accessible
8. Add motion/animation cues (subtle pulse, hover scale) for extra energy
