# XHS Bold Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** High impact, attention-grabbing, commanding, and assertive. A Xiaohongshu aesthetic that stops the scroll and demands attention.
- **Emotional Description:** Powerful, urgent, confident, and dramatic. It feels like a bold headline, a warning sign, or a must-read announcement.
- **Key Characteristics:**
  - Vibrant red, orange, and yellow against deep black backgrounds.
  - High contrast compositions with dramatic visual weight.
  - Bold geometric shapes and strong lines.
  - Exclamation marks, arrows, and warning icons.
  - 3D shadow text and stroke-text typography.
  - Large, commanding headlines that dominate the space.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Red** | `#E53E3E` | Main accents, primary buttons, urgent highlights |
| **Primary Orange** | `#DD6B20` | Warm accents, energetic elements |
| **Primary Yellow** | `#F6E05E` | Attention grabbers, stars, highlights |
| **Secondary White** | `#FFFFFF` | Text on dark backgrounds, high contrast elements |
| **Secondary Neon Yellow** | `#F7FF00` | Extreme highlights, warning accents |
| **Interactive Red** | `#C53030` | Hover states, active elements |
| **Neutral 100** | `#F7FAFC` | Light text on dark backgrounds |
| **Neutral 300** | `#CBD5E0` | Secondary text on dark backgrounds |
| **Neutral 500** | `#718096` | Muted text |
| **Surface Black** | `#000000` | Main page background, dramatic canvas |
| **Surface Charcoal** | `#1A1A1A` | Card backgrounds, panels |
| **Surface Dark Gray** | `#2D3748` | Elevated surfaces, containers |
| **Semantic Success** | `#48BB78` | Success states (green accent on dark) |
| **Semantic Warning** | `#F6E05E` | Warnings (yellow on dark) |
| **Semantic Error** | `#E53E3E` | Errors, destructive actions |
| **Semantic Info** | `#4299E1` | Informational callouts (blue on dark) |

## 3. Typography Rules

- **Font Family:** A bold, heavy display font (e.g., Impact, Oswald, or Anton) for headers. A clean, bold sans-serif (e.g., Montserrat, Poppins) for body text.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Heavy Display | 64px / 4rem | 900 | 1.0 | -0.03em | Dominating, 3D shadow, stroke |
| H1 | Heavy Display | 44px / 2.75rem | 900 | 1.05 | -0.02em | Bold, commanding |
| H2 | Bold Sans | 30px / 1.875rem | 800 | 1.15 | -0.01em | Sub-section headers |
| H3 | Bold Sans | 24px / 1.5rem | 700 | 1.25 | 0 | Card titles |
| Body | Sans-serif | 16px / 1rem | 500 | 1.6 | 0 | Main readable text, medium weight |
| Body Small | Sans-serif | 14px / 0.875rem | 400 | 1.5 | 0.005em | Captions |
| Label | Bold Sans | 12px / 0.75rem | 800 | 1.4 | 0.08em | Uppercase, badges |
| Button | Bold Sans | 16px / 1rem | 800 | 1 | 0.02em | Bold and commanding |
| Warning Text | Display | 20px / 1.25rem | 900 | 1.1 | 0.02em | Exclamation text, red/yellow |

- **Principles:** Headers should be massive, bold, and impossible to ignore. Use negative letter spacing for a tight, impactful look. Body text should be medium weight for readability against dark backgrounds.

## 4. Component Stylings

### Buttons
- **Primary:** Flat Primary Red `#E53E3E` fill, white bold text, 0px border-radius (sharp corners), no border, bold shadow.
- **Secondary:** Flat Primary Orange `#DD6B20` fill, white bold text, 0px border-radius, bold shadow.
- **Warning:** Flat Primary Yellow `#F6E05E` fill, black bold text, 0px border-radius, bold shadow.
- **Ghost:** Transparent background, 2px solid White `#FFFFFF` border, white text, 0px border-radius.

### Cards & Containers
- **Card:** Surface Charcoal `#1A1A1A` background, 1px solid Surface Dark Gray `#2D3748` border, 0px border-radius (sharp), bold shadow.
- **Alert Panel:** Surface Black `#000000` background, 2px solid Primary Red `#E53E3E` left border, 0px border-radius.
- **Warning Box:** Primary Yellow `#F6E05E` background, black text, 0px border-radius, bold shadow.

### Inputs & Forms
- **Text Input:** Surface Dark Gray `#2D3748` background, 1px solid Neutral 500 border, 0px border-radius, white text.
- **Focus State:** Border changes to Primary Red `#E53E3E`, add red glow.
- **Checkbox/Radio:** Sharp squares, 1px border, bold fill when checked.

### Navigation
- **Nav Bar:** Surface Black `#000000` background, 1px bottom border in Surface Dark Gray.
- **Nav Item:** Bold white text, hover turns Primary Red `#E53E3E`.
- **Active Nav Item:** Primary Red `#E53E3E` text with a bold underline.

### Image Treatment
- Images should have sharp corners (0px radius) or thick bold borders.
- Optional high-contrast filter.
- Optional red or yellow border for emphasis.
- Dramatic, high-impact imagery preferred.

### Distinctive Components
- **Exclamation Badge:** A bold exclamation mark icon in a circle, red or yellow.
- **Arrow Pointer:** A bold, chunky arrow pointing to important content.
- **Warning Strip:** A diagonal striped banner (like caution tape) in red/yellow.
- **Starburst Alert:** A starburst shape for critical announcements.
- **Red Border Frame:** A thick red border around important content.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px.
- **Grid & Container:**
  - Max container width: 1200px.
  - 12-column grid with 24px gutters.
  - Strong, centered compositions with dramatic focal points.
- **Whitespace Philosophy:** Dramatic and intentional. Use large blocks of dark space to make bright elements pop. The contrast between dark void and bright content creates visual tension and impact.
- **Border Radius Scale:**
  - None: 0px (default for most elements - sharp, bold look)
  - Small: 4px (rarely used, only for small tags)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat on black | Base layer |
| 1 | `box-shadow: 0 4px 6px rgba(0,0,0,0.5)` | Resting cards |
| 2 | `box-shadow: 0 8px 16px rgba(0,0,0,0.6)` | Hover cards |
| 3 | `box-shadow: 0 12px 24px rgba(0,0,0,0.7)` | Modals, emphasis |
| 4 | Colored glow (red/yellow) | Special emphasis, warnings |

- **Shadow Philosophy:** Dark, heavy shadows that enhance the dramatic feel. Use colored glows (red, yellow) for warnings and special emphasis. Shadows should be prominent, not subtle.

## 7. Do's and Don'ts

- **DO:**
  - Use a dark background (black or charcoal) as the base.
  - Apply bright, saturated accent colors (red, orange, yellow).
  - Use sharp corners (0px border-radius) for a bold look.
  - Create high contrast between text and background.
  - Use massive, bold typography for headers.
  - Include warning-style elements (exclamation marks, arrows).
- **DON'T:**
  - Use light or pastel backgrounds.
  - Apply rounded corners (breaks the bold aesthetic).
  - Use thin, light typography.
  - Create soft, subtle layouts.
  - Use muted or desaturated colors.
  - Apply gentle shadows or minimal depth.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, bold elements stack, nav collapses to hamburger |
| Tablet | 640px - 1024px | 2-column grid, side panels become overlays |
| Desktop | > 1024px | Full multi-column grid, dramatic centered layouts |

- **Touch Targets:** Minimum 48x48px for all interactive elements.
- **Collapsing Strategy:** Bold cards stack vertically. Navigation collapses into a dark hamburger menu.
- **Image Behavior:** Images maintain aspect ratio, sharp corners persist. High-contrast treatment should remain at all sizes.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#E53E3E` (Red), `#DD6B20` (Orange), `#F6E05E` (Yellow)
- Background: `#000000` (Black), `#1A1A1A` (Charcoal), `#2D3748` (Dark Gray)
- Text: `#FFFFFF` (White), `#F7FAFC` (Light), `#CBD5E0` (Muted)
- Accents: `#F7FF00` (Neon Yellow)

### Example Component Prompts

1. **Bold Action Button:** "Create a button with a flat red `#E53E3E` fill, white bold text, 0px border-radius (sharp corners), and a bold dark shadow (`0 4px 0px rgba(0,0,0,0.5)`). Hover state should shift the button down 2px."
2. **Alert Card:** "Design a card with a charcoal `#1A1A1A` background, a 2px solid red `#E53E3E` left border, 0px border-radius, and white text. Add a bold exclamation icon."
3. **Warning Banner:** "Create a banner with a yellow `#F6E05E` background, black bold text, 0px border-radius, and a bold shadow. Add a warning triangle icon."
4. **Bold Input Field:** "Design a text input with a dark gray `#2D3748` background, a 1px solid `#718096` border, 0px border-radius, and white text. Focus state should add a red `#E53E3E` border and glow."
5. **Exclamation Badge:** "Create a circular badge with a red `#E53E3E` fill, white bold exclamation mark, 0px border-radius (sharp octagon or square), and bold shadow."
6. **Impact Header:** "Design a page header with a black background, massive bold display font in white, a red `#E53E3E` accent underline, and dramatic spacing."

### Iteration Guide
1. **Start Dark:** Begin with a black or charcoal background.
2. **Add Contrast:** Introduce bright red, orange, and yellow accents.
3. **Sharpen:** Set all border-radii to 0px for a bold, sharp look.
4. **Bold Typography:** Use heavy display fonts with negative letter spacing for headers.
5. **Warning Elements:** Add exclamation marks, arrows, and bold borders to key elements for impact.
