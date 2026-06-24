# Pastel — Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Gentle, whimsical, soft — nurturing and dreamy
- **Emotional Description:** Light, airy, and comforting; evokes storybooks, spring gardens, and gentle creativity
- **Key Characteristics:**
  - Soft, desaturated colors with a dreamy quality
  - Rounded, cute proportions throughout
  - Decorative flourishes like stars, sparkles, and flowers
  - Gentle shadows and soft highlights
  - Playful, approachable illustrations

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Soft Pink | #FFB6C1 | Primary buttons, feminine accents, highlights |
| **Secondary** | Mint | #98D8C8 | Secondary actions, success, fresh elements |
| **Tertiary** | Lavender | #C8A2C8 | Decorative accents, tags, soft backgrounds |
| **Background** | White | #FFFFFF | Main page background |
| **Background Alt** | Light Cream | #FFF8E7 | Cards, panels, warm sections |
| **Accent 1** | Butter Yellow | #FFFACD | Highlights, badges, cheerful elements |
| **Accent 2** | Sky Blue | #BEE3F8 | Info, calm elements, water themes |
| **Surface** | Soft White | #FFFDF5 | Elevated cards, modals |
| **Text Primary** | Soft Charcoal | #4A4A4A | Headings, body text (softened black) |
| **Text Secondary** | Warm Gray | #8A8A8A | Captions, metadata |
| **Border** | Pastel Gray | #E8E0D5 | Dividers, input borders |
| **Semantic Success** | Soft Mint | #98D8C8 | Success states |
| **Semantic Error** | Soft Rose | #E8A5A5 | Error states (gentle) |
| **Semantic Warning** | Soft Peach | #F5C6A5 | Warning states |

---

## 3. Typography Rules

**Font Family:**
- **Primary:** "Quicksand" or "Varela Round" — rounded, friendly sans-serif
- **Headings:** "Fredoka One" or "Baloo 2" — playful, rounded display
- **Accent:** "Pacifico" or "Caveat" — handwritten for special moments

**Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Baloo 2 | 48px / 3rem | 600 | 1.2 | 0 | Hero headlines, playful |
| H1 | Baloo 2 | 36px / 2.25rem | 600 | 1.25 | 0 | Page titles |
| H2 | Baloo 2 | 28px / 1.75rem | 600 | 1.3 | 0 | Section headers |
| H3 | Baloo 2 | 22px / 1.375rem | 500 | 1.35 | 0 | Card titles |
| H4 | Baloo 2 | 18px / 1.125rem | 500 | 1.4 | 0.01em | Subsection |
| Body | Quicksand | 16px / 1rem | 400 | 1.7 | 0.01em | Main text |
| Body Small | Quicksand | 14px / 0.875rem | 400 | 1.6 | 0.01em | Captions |
| Label | Quicksand | 12px / 0.75rem | 600 | 1.4 | 0.03em | Labels |
| Handwritten | Pacifico | 20px / 1.25rem | 400 | 1.4 | 0 | Special touches |
| Button | Quicksand | 16px / 1rem | 600 | 1 | 0.01em | Rounded buttons |

**Principles:**
- Rounded, soft letterforms throughout
- Generous line-height for airy feel
- Soft charcoal instead of pure black
- Playful weights for headings, gentle for body

---

## 4. Component Stylings

### Buttons
- **Primary:** Background #FFB6C1, text white or soft charcoal, border-radius 16px, padding 12px 24px
- **Secondary:** Background #98D8C8, text soft charcoal
- **Tertiary:** Background #C8A2C8, text white
- **Ghost:** Transparent, border 2px solid #FFB6C1
- **Hover:** Scale 1.03, background lightens, soft shadow appears

### Cards & Containers
- Background: #FFFDF5 or #FFF8E7
- Border-radius: 20px (very rounded, cute)
- Border: 1px solid #E8E0D5 or none
- Shadow: 0 4px 16px rgba(0,0,0,0.06) — very soft
- Padding: 24px
- Optional: Decorative corner (small flower, star, heart)

### Inputs & Forms
- Background: #FFFFFF
- Border: 2px solid #E8E0D5
- Border-radius: 16px
- Focus: Border #FFB6C1, soft pink glow
- Placeholder: #C4B8A8

### Navigation
- Background: #FFFFFF or transparent
- Links: Quicksand, soft charcoal
- Active: Soft pink underline or pill background
- Hover: Light cream background
- Logo: Playful, rounded

### Image Treatment
- Soft, dreamy photography
- Rounded corners (20px+)
- Optional pastel color overlay
- Cute illustrations and characters
- Sparkle and star decorations

### Distinctive Components
- **Cute Badge:** Rounded pill, pastel background, small icon
- **Star Rating:** Pastel yellow stars, large and prominent
- **Storybook Quote:** Handwritten font, cream background, decorative quotes
- **Character Avatar:** Rounded, with decorative border

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
- Max container width: 1200px
- Grid: 12-column, gutter 24px
- Page padding: 24px (mobile), 48px (desktop)

### Whitespace Philosophy
- Very generous whitespace — lightness and airiness
- Section vertical spacing: 64–96px
- Soft, flowing layouts rather than rigid grids
- Room for decorative elements to breathe

### Border Radius Scale
- sm: 12px (small buttons, tags)
- md: 16px (buttons, inputs)
- lg: 20px (cards, panels)
- xl: 28px (large containers, hero sections)
- full: 9999px (pills, avatars)

---

## 6. Depth & Elevation

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat | Base layout |
| 1 | 0 2px 8px rgba(0,0,0,0.05) | Cards at rest |
| 2 | 0 4px 16px rgba(0,0,0,0.06) | Hover cards |
| 3 | 0 8px 24px rgba(0,0,0,0.08) | Modals |

**Shadow Philosophy:** Shadows are extremely soft and subtle — barely noticeable. The aesthetic values lightness and air over depth. Elevation is communicated through soft color differentiation rather than strong shadows.

---

## 7. Do's and Don'ts

**Do:**
- Use very rounded corners (16px+) for everything
- Include cute decorative elements (stars, hearts, flowers)
- Use soft, dreamy photography and illustrations
- Employ handwritten fonts for special touches
- Maintain generous whitespace
- Use gentle, soft shadows

**Don't:**
- Use sharp corners or angular shapes
- Use dark, heavy colors
- Use bold, aggressive typography
- Create dense, information-heavy layouts
- Use strong shadows or harsh contrasts
- Use technical or corporate imagery

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, maintained cuteness, 16px padding |
| Tablet | 640–1024px | 2 columns, 24px padding |
| Desktop | > 1024px | Full grid, 48px padding |

**Touch Targets:** Minimum 44x44px

**Collapsing Strategy:**
- Navigation collapses to cute hamburger with rounded icon
- Cards stack vertically
- Decorative elements may reduce in number on small screens
- Typography scales down gently

**Image Behavior:**
- Images maintain rounded corners
- Center-crop to preserve cute composition
- Illustrations scale proportionally

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: #FFB6C1 (Soft Pink)
- Secondary: #98D8C8 (Mint)
- Tertiary: #C8A2C8 (Lavender)
- Background: #FFFFFF (White)
- Accent: #FFFACD (Butter Yellow)
- Text: #4A4A4A (Soft Charcoal)

### Example Component Prompts

1. **Whimsical Hero Section:** "Create a hero section with white background, large Baloo 2 headline in soft charcoal, soft pink CTA button with 16px rounded corners, and cute illustrated characters with stars and sparkles."

2. **Cute Product Card:** "Design a product card with light cream background, 20px border-radius, soft pink 'New' badge with heart icon, Baloo 2 product name, Quicksand description, and mint-colored price tag."

3. **Gentle Form:** "Build a signup form with white inputs, pastel gray borders, 16px radius, soft pink focus glow, and a rounded lavender submit button. Include a handwritten 'Welcome!' note."

4. **Playful Navigation:** "Create a navigation bar with white background, Baloo 2 logo in soft pink, Quicksand links with soft charcoal, and a rounded pink 'Join' button."

5. **Storybook Quote:** "Design a quote block with light cream background, Pacifico handwritten text in soft charcoal, decorative quotation marks in lavender, and small star decorations."

6. **Cute Feature Grid:** "Build a 3-column feature grid with pastel-colored cards (pink, mint, lavender), white rounded icons, Baloo 2 headings, and Quicksand body text on white background."

### Iteration Guide
1. Start with white background and soft charcoal text
2. Add soft pink for primary actions and feminine touches
3. Introduce mint for freshness and secondary elements
4. Use lavender for decorative accents and variety
5. Add butter yellow for cheerful highlights and badges
6. Round all corners to 16px or more
7. Include cute decorative elements (stars, hearts, sparkles)
8. Ensure everything feels gentle, never harsh or aggressive
