# Earth — Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Natural, organic, grounded — authentic and wholesome
- **Emotional Description:** Connected to nature and sustainability; evokes forest walks, organic markets, and mindful living
- **Key Characteristics:**
  - Earthy, muted tones inspired by natural landscapes
  - Organic shapes and flowing lines rather than rigid geometry
  - Botanical and nature-inspired decorative elements
  - Textures that evoke natural materials (wood, stone, linen)
  - Warm, inviting photography of nature and wellness

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Forest Green | #276749 | Primary buttons, eco badges, active states |
| **Secondary** | Sage | #9AE6B4 | Secondary actions, highlights, soft backgrounds |
| **Tertiary** | Earth Brown | #744210 | Headings, emphasis, natural text |
| **Background** | Sand Beige | #F5E6D3 | Main page background |
| **Background Alt** | Sky Blue | #E0F2FE | Light sections, water-themed areas |
| **Accent 1** | Sunset Orange | #ED8936 | Warm accents, CTAs, energy |
| **Accent 2** | Water Blue | #63B3ED | Info elements, cool balance |
| **Surface** | Cream | #FFFAF0 | Cards, panels, elevated surfaces |
| **Text Primary** | Dark Brown | #4A3728 | Headings, body text |
| **Text Secondary** | Warm Gray | #8C7B6B | Captions, metadata |
| **Border** | Sand | #D4C4B0 | Dividers, input borders |
| **Semantic Success** | Leaf Green | #48BB78 | Success, eco-friendly indicators |
| **Semantic Error** | Clay Red | #C53030 | Error states |
| **Semantic Warning** | Amber | #D69E2E | Warnings |

---

## 3. Typography Rules

**Font Family:**
- **Primary:** "Merriweather" or "Lora" — warm serif for headings
- **Body:** "Open Sans" or "Nunito" — friendly, readable sans-serif
- **Accent:** "Caveat" or "Kalam" — handwritten feel for quotes and labels

**Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Merriweather | 48px / 3rem | 700 | 1.15 | -0.01em | Hero headlines |
| H1 | Merriweather | 36px / 2.25rem | 700 | 1.2 | 0 | Page titles |
| H2 | Merriweather | 28px / 1.75rem | 700 | 1.25 | 0 | Section headers |
| H3 | Merriweather | 22px / 1.375rem | 600 | 1.3 | 0 | Card titles |
| H4 | Merriweather | 18px / 1.125rem | 600 | 1.4 | 0.01em | Subsection |
| Body | Open Sans | 16px / 1rem | 400 | 1.7 | 0.01em | Main text |
| Body Small | Open Sans | 14px / 0.875rem | 400 | 1.6 | 0.01em | Captions |
| Label | Open Sans | 12px / 0.75rem | 600 | 1.4 | 0.05em | Uppercase labels |
| Handwritten | Caveat | 24px / 1.5rem | 400 | 1.3 | 0 | Quotes, special labels |
| Button | Open Sans | 16px / 1rem | 600 | 1 | 0.01em | All buttons |

**Principles:**
- Serif headings evoke tradition and nature
- Generous line-height (1.7) for comfortable reading
- Dark brown text instead of black for warmth
- Handwritten font for personal, organic touches

---

## 4. Component Stylings

### Buttons
- **Primary:** Background #276749, text white, border-radius 12px, padding 12px 24px
- **Secondary:** Background #9AE6B4, text #276749, border-radius 12px
- **Tertiary / Outline:** Transparent, border 2px solid #276749, text #276749
- **Warm CTA:** Background #ED8936, text white (for energy/promotion)
- **Hover:** Darken background 8%, subtle scale

### Cards & Containers
- Background: #FFFAF0 or #F5E6D3
- Border-radius: 16px (organic, soft)
- Border: 1px solid #D4C4B0
- Shadow: 0 4px 12px rgba(74,55,40,0.08)
- Padding: 24px
- Optional: Subtle leaf or botanical corner decoration

### Inputs & Forms
- Background: #FFFFFF
- Border: 2px solid #D4C4B0
- Border-radius: 12px
- Focus: Border #276749, subtle green glow
- Placeholder: #B8A99A

### Navigation
- Background: #F5E6D3 with subtle texture
- Links: Open Sans, dark brown
- Active: Forest green underline or pill background
- Hover: Sage background tint

### Image Treatment
- Natural, warm photography
- Slight warm filter on images
- Rounded corners (16px) for organic feel
- Nature imagery: forests, mountains, organic products

### Distinctive Components
- **Eco Badge:** Leaf icon, sage background, forest green text
- **Nature Quote:** Handwritten Caveat font, sand background, botanical illustration
- **Sustainability Meter:** Green gradient progress bar
- **Organic Card:** Cream background with subtle leaf watermark

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
- Generous, natural breathing room
- Section vertical spacing: 64–96px
- Organic flow rather than rigid grid alignment
- Nature doesn't use perfect grids — embrace slight asymmetry

### Border Radius Scale
- sm: 8px (small buttons, tags)
- md: 12px (buttons, inputs)
- lg: 16px (cards, panels)
- xl: 24px (large containers, hero sections)
- full: 9999px (pills, badges)

---

## 6. Depth & Elevation

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat, natural surface | Base layout |
| 1 | 0 2px 8px rgba(74,55,40,0.06) | Cards at rest |
| 2 | 0 4px 12px rgba(74,55,40,0.08) | Hover cards |
| 3 | 0 8px 24px rgba(74,55,40,0.1) | Modals, dropdowns |
| 4 | 0 16px 48px rgba(74,55,40,0.12) | Full-screen overlays |

**Shadow Philosophy:** Shadows carry warm brown undertones, mimicking natural light. Elevation is gentle and organic — avoid harsh, high-contrast shadows. Think dappled sunlight through leaves, not fluorescent office lighting.

---

## 7. Do's and Don'ts

**Do:**
- Use organic shapes and flowing lines
- Include botanical and nature-inspired illustrations
- Use photography featuring natural landscapes and organic textures
- Employ earthy textures (subtle wood grain, linen, stone)
- Use handwritten fonts for personal touches
- Maintain warm, inviting color temperature throughout

**Don't:**
- Use neon or synthetic-looking colors
- Create sharp, angular geometric patterns
- Use cold gray backgrounds
- Overuse technology-focused imagery
- Use synthetic materials aesthetic (plastic, chrome)
- Forget accessibility — ensure sufficient contrast

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, 16px padding, stacked cards |
| Tablet | 640–1024px | 2 columns, 24px padding |
| Desktop | > 1024px | Full grid, 48px padding, sidebars |

**Touch Targets:** Minimum 44x44px

**Collapsing Strategy:**
- Navigation collapses to hamburger below 768px
- Cards stack vertically on mobile
- Typography scales down 15% on mobile
- Decorative botanical elements may simplify on small screens

**Image Behavior:**
- Nature images: maintain aspect ratio, center on subject
- Hero images: full-width with subtle warm overlay

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: #276749 (Forest Green)
- Secondary: #9AE6B4 (Sage)
- Background: #F5E6D3 (Sand Beige)
- Accent: #ED8936 (Sunset Orange)
- Text: #4A3728 (Dark Brown)
- Water: #63B3ED (Water Blue)

### Example Component Prompts

1. **Nature Hero Section:** "Create a hero section with sand beige background, Merriweather headline in dark brown, forest green CTA button with rounded corners, and a warm nature photograph with subtle overlay."

2. **Eco Product Card:** "Design a product card with cream background, 16px border-radius, forest green 'Eco-Friendly' badge with leaf icon, Merriweather product name, Open Sans description, and sage price tag."

3. **Sustainability Form:** "Build a newsletter signup form with white inputs, sand borders, forest green focus state, and sunset orange submit button. Include a handwritten 'Join the movement' label."

4. **Organic Navigation:** "Create a navigation bar with sand beige background, dark brown Merriweather logo, Open Sans links with forest green hover, and a rounded forest green CTA."

5. **Wellness Quote Block:** "Design a testimonial with sand background, handwritten Caveat quote text in dark brown, small botanical leaf decoration, and attribution in Open Sans."

6. **Nature Feature Grid:** "Build a 3-column feature grid with cream cards, forest green icons, Merriweather headings, Open Sans body text, and subtle leaf watermark on sand background."

### Iteration Guide
1. Start with sand beige background and dark brown text
2. Add forest green for primary actions and eco indicators
3. Introduce sage for secondary elements and soft backgrounds
4. Use sunset orange sparingly for energy and warm CTAs
5. Add water blue for balance and info elements
6. Incorporate organic shapes and botanical illustrations
7. Use handwritten fonts for personal, authentic touches
8. Ensure nature photography has warm, inviting color grading
