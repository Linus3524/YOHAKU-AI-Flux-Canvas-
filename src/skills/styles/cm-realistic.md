# Realistic Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Sophisticated, professional, mature, and polished. A digital painting aesthetic with anatomical accuracy and rich environmental rendering.
- **Emotional Description:** Refined, trustworthy, immersive, and contemplative. It feels like a high-quality editorial or documentary experience.
- **Key Characteristics:**
  - Anatomically accurate proportions and realistic features.
  - Rich, smooth color gradients for depth and volume.
  - Realistic material textures (glass, liquid, fabric, wood).
  - Detailed, atmospheric backgrounds with accurate perspective.
  - Subtle, natural lighting with warm/cool contrast.
  - Professional aesthetic without exaggeration.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Wine** | `#722F37` | Primary buttons, key accents, elegant highlights |
| **Primary Gold** | `#D4AF37` | Premium accents, stars, rewards, luxury elements |
| **Primary Amber** | `#FFB347` | Warm highlights, interactive hover states |
| **Secondary Teal** | `#38B2AC` | Cool accents, complementary interactive elements |
| **Interactive Blue** | `#B0C4DE` | Links, focus states, cool atmospheric elements |
| **Neutral 900** | `#1A202C` | Primary text, strong outlines |
| **Neutral 700** | `#4A5568` | Secondary text, captions |
| **Neutral 500** | `#718096` | Placeholder text, disabled states |
| **Neutral 300** | `#CBD5E0` | Dividers, subtle borders |
| **Neutral 100** | `#F7FAFC` | Subtle backgrounds |
| **Surface Cream** | `#F5D6C6` | Warm skin-tone inspired backgrounds |
| **Surface Warm Wood** | `#8B7355` | Earthy panel backgrounds, natural containers |
| **Surface Cool Stone** | `#9CA3AF` | Cool gray panels, professional sections |
| **Semantic Success** | `#48BB78` | Success states, positive feedback |
| **Semantic Warning** | `#ECC94B` | Warnings, pending states |
| **Semantic Error** | `#E53E3E` | Errors, destructive actions |
| **Semantic Info** | `#3182CE` | Informational callouts |

## 3. Typography Rules

- **Font Family:** An elegant serif (e.g., Playfair Display, Merriweather) for headers to convey sophistication. A clean sans-serif (e.g., Inter, Lato) for body text to ensure readability.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Serif | 48px / 3rem | 700 | 1.15 | -0.01em | Elegant, refined, editorial feel |
| H1 | Serif | 36px / 2.25rem | 700 | 1.2 | -0.005em | Page titles, hero text |
| H2 | Serif | 28px / 1.75rem | 600 | 1.3 | 0 | Section headers |
| H3 | Sans-serif | 22px / 1.375rem | 600 | 1.4 | 0 | Sub-section headers |
| Body | Sans-serif | 16px / 1rem | 400 | 1.7 | 0 | Main readable text, generous line height |
| Body Small | Sans-serif | 14px / 0.875rem | 400 | 1.6 | 0.005em | Captions, metadata |
| Label | Sans-serif | 12px / 0.75rem | 600 | 1.4 | 0.08em | Uppercase, badges, tags |
| Button | Sans-serif | 16px / 1rem | 600 | 1 | 0.01em | Clean and professional |
| Quote | Serif | 20px / 1.25rem | 400 | 1.6 | 0 | Italic, elegant pull quotes |

- **Principles:** Contrast between elegant serif headers and clean sans-serif body text. Generous line height for a breathable, editorial feel. Subtle expressions in typography.

## 4. Component Stylings

### Buttons
- **Primary:** Rich gradient from Wine `#722F37` to a deeper shade, subtle inner shadow for depth, 6px border-radius, no heavy outline.
- **Secondary:** Flat Warm Wood `#8B7355`, subtle border, 6px border-radius.
- **Premium:** Gradient from Gold `#D4AF37` to Amber `#FFB347`, elegant text shadow, 6px border-radius.
- **Ghost:** Transparent fill, 1px solid Neutral 300 border, 6px border-radius.

### Cards & Containers
- **Card:** White `#FFFFFF` background, 1px solid Neutral 200 border, 8px border-radius, soft gradient shadow for depth.
- **Panel:** Surface Cream `#F5D6C6` or Surface Cool Stone `#9CA3AF` background, no border, 8px border-radius, subtle inner shadow.
- **Premium Card:** Gradient border (Gold to Amber), white background, elegant shadow.

### Inputs & Forms
- **Text Input:** White background, 1px solid Neutral 300 border, 6px border-radius, subtle inner shadow.
- **Focus State:** Border changes to Wine `#722F37`, soft glow effect.
- **Checkbox/Radio:** Rounded, 1px border, subtle gradient fill when checked.

### Navigation
- **Nav Bar:** White `#FFFFFF` background, 1px bottom border in Neutral 200, subtle shadow.
- **Nav Item:** Sans-serif text in Neutral 700, hover transitions to Wine `#722F37`.
- **Active Nav Item:** Wine `#722F37` text with a subtle underline in Gold `#D4AF37`.

### Image Treatment
- Images should have soft rounded corners (8px).
- No heavy outlines; let the image content speak.
- Optional subtle shadow for depth.
- Support for high-resolution, detailed imagery.

### Distinctive Components
- **Editorial Card:** Large image with overlaid serif text, gradient scrim for readability.
- **Quote Block:** Left border in Gold `#D4AF37`, serif italic text, generous padding.
- **Timeline/Process:** Connected nodes with subtle gradient lines, realistic icons.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px, 3xl: 64px.
- **Grid & Container:**
  - Max container width: 1200px.
  - 12-column grid with 32px gutters.
  - Asymmetric editorial layouts encouraged.
- **Whitespace Philosophy:** Generous and breathable. Whitespace is used to create a premium, uncluttered feel. Elements should have room to breathe, mimicking high-end editorial design.
- **Border Radius Scale:**
  - Small: 4px (small tags, badges)
  - Medium: 6px (buttons, inputs)
  - Large: 8px (cards, panels)
  - XL: 12px (modals, large containers)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat | Base layer |
| 1 | `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` | Resting cards |
| 2 | `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` | Hover cards, dropdowns |
| 3 | `box-shadow: 0 10px 15px rgba(0,0,0,0.12)` | Modals, popovers |
| 4 | `box-shadow: 0 20px 25px rgba(0,0,0,0.15)` | Premium emphasis, hero elements |

- **Shadow Philosophy:** Soft, realistic shadows that mimic natural lighting. Shadows should be subtle and diffuse, never harsh. Use warm-tinted shadows for indoor/light themes and cool-tinted shadows for professional/dark themes.

## 7. Do's and Don'ts

- **DO:**
  - Use rich, smooth gradients for depth and volume.
  - Apply realistic material textures where appropriate.
  - Use subtle, natural lighting with warm/cool contrast.
  - Maintain anatomically accurate proportions in illustrations.
  - Use generous whitespace for a premium feel.
  - Combine elegant serif headers with clean sans-serif body text.
- **DON'T:**
  - Use flat cel-shading or cartoonish exaggeration.
  - Apply heavy outlines or comic-style borders.
  - Use overly bright, saturated colors (keep it sophisticated).
  - Create cluttered, dense layouts.
  - Use harsh, dark drop shadows.
  - Mix too many font styles.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, generous padding, nav collapses to hamburger |
| Tablet | 640px - 1024px | 2-column grid, sidebars become overlays |
| Desktop | > 1024px | Full multi-column grid, editorial asymmetric layouts |

- **Touch Targets:** Minimum 44x44px for all interactive elements.
- **Collapsing Strategy:** Editorial cards stack vertically, maintaining image aspect ratios. Navigation collapses into a clean hamburger menu.
- **Image Behavior:** Images maintain aspect ratio, rounded corners persist. High-resolution images should lazy-load. Gradient scrims should adapt to image size.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#722F37` (Wine), `#D4AF37` (Gold), `#FFB347` (Amber)
- Background: `#F5D6C6` (Cream), `#8B7355` (Wood), `#9CA3AF` (Stone)
- Surface: `#FFFFFF` (White), `#F7FAFC` (Light Gray)
- Text: `#1A202C` (Primary), `#4A5568` (Secondary)

### Example Component Prompts

1. **Editorial Hero Card:** "Create a large hero card with a full-bleed image, a gradient scrim from transparent to dark at the bottom, and elegant serif text overlaid. 12px border-radius on the container. No heavy borders."
2. **Premium Action Button:** "Design a button with a rich gradient from Wine `#722F37` to a deeper shade, white text, 6px border-radius, and a subtle inner shadow for depth. Hover state should slightly lighten the gradient."
3. **Quote Block:** "Create a blockquote component with a 3px left border in Gold `#D4AF37`, serif italic text in Neutral 700, and generous padding. Background should be Surface Cream `#F5D6C6`."
4. **Realistic Panel:** "Design a content panel with a subtle gradient background from warm cream to white, 8px border-radius, a soft shadow, and no visible border. Content should have generous line height."
5. **Elegant Navigation:** "Create a navigation bar with a white background, a 1px bottom border in Neutral 200, and subtle shadow. Active item should have Wine `#722F37` text with a Gold `#D4AF37` underline. Use sans-serif font."
6. **Image Gallery Card:** "Design an image card with 8px border-radius, a soft shadow, and a caption area below with sans-serif text. No outlines on the image."

### Iteration Guide
1. **Start Sophisticated:** Begin with a refined color palette and elegant typography pairing (serif + sans-serif).
2. **Add Depth:** Introduce soft gradients and subtle shadows for volume. Avoid flat fills.
3. **Texture Polish:** Add realistic material textures or subtle patterns where appropriate (wood grain, fabric weave).
4. **Lighting Review:** Ensure lighting is consistent. Use warm shadows for warm themes and cool shadows for cool themes.
5. **Whitespace Audit:** Check that elements have generous breathing room. Reduce density if needed.
