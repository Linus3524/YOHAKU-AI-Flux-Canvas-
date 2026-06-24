# XHS Pop Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Vibrant, energetic, eye-catching, and youthful. A Xiaohongshu aesthetic that demands attention and radiates excitement.
- **Emotional Description:** Exciting, dynamic, bold, and fun. It feels like a burst of confetti or a lively street festival.
- **Key Characteristics:**
  - Bold, saturated colors with high contrast.
  - Dynamic, energetic compositions with movement.
  - Comic-style effects (starbursts, speech bubbles, exclamation marks).
  - 3D shadow text and stroke-text typography.
  - Confetti, squiggles, and energetic doodles.
  - High-saturation image filters.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Red** | `#F56565` | Main accents, primary buttons, energetic highlights |
| **Primary Yellow** | `#ECC94B` | Stars, highlights, attention grabbers |
| **Primary Blue** | `#4299E1` | Cool accents, interactive elements |
| **Primary Green** | `#48BB78` | Success states, positive energy |
| **Secondary Neon Pink** | `#FF69B4` | Bold accents, feminine energy |
| **Secondary Electric Purple** | `#9F7AEA` | Magical accents, creative elements |
| **Interactive Orange** | `#ED8936` | Hover states, warm highlights |
| **Neutral 900** | `#1A202C` | Primary text |
| **Neutral 700** | `#4A5568` | Secondary text |
| **Neutral 400** | `#A0AEC0` | Placeholder text |
| **Neutral 200** | `#E2E8F0` | Dividers |
| **Surface White** | `#FFFFFF` | Main page background |
| **Surface Light Gray** | `#F7FAFC` | Card backgrounds, panels |
| **Semantic Success** | `#48BB78` | Success states |
| **Semantic Warning** | `#ECC94B` | Warnings |
| **Semantic Error** | `#F56565` | Errors |
| **Semantic Info** | `#4299E1` | Informational callouts |

## 3. Typography Rules

- **Font Family:** A bold, dynamic display font (e.g., Fredoka One, Baloo, or a bold rounded sans-serif) for headers. A clean sans-serif for body text.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Bold Display | 56px / 3.5rem | 900 | 1.05 | -0.02em | 3D shadow, stroke text, dynamic |
| H1 | Bold Display | 40px / 2.5rem | 800 | 1.1 | -0.01em | Bold with outline or shadow |
| H2 | Bold Sans | 28px / 1.75rem | 700 | 1.2 | -0.005em | Sub-section headers |
| H3 | Bold Sans | 22px / 1.375rem | 700 | 1.3 | 0 | Card titles |
| Body | Sans-serif | 16px / 1rem | 400 | 1.6 | 0 | Main readable text |
| Body Small | Sans-serif | 14px / 0.875rem | 400 | 1.5 | 0.005em | Captions |
| Label | Bold Sans | 12px / 0.75rem | 800 | 1.4 | 0.05em | Uppercase, badges |
| Button | Bold Sans | 16px / 1rem | 800 | 1 | 0.01em | Bold and commanding |
| SFX Text | Display | 24px / 1.5rem | 900 | 1 | 0.05em | Sound effects, emphasis |

- **Principles:** Headers should be bold, dynamic, and attention-grabbing. Use stroke-text effects (text with an outline) and 3D shadows. Body text should remain readable despite the energetic headers.

## 4. Component Stylings

### Buttons
- **Primary:** Gradient from Primary Red `#F56565` to Neon Pink `#FF69B4`, white bold text, 3D shadow, 8px border-radius, stroke outline.
- **Secondary:** Flat Primary Yellow `#ECC94B`, dark bold text, 3D shadow, 8px border-radius.
- **Action:** Starburst or irregular shape, bright gradient, bold text, heavy outline.
- **Ghost:** Transparent, 2px solid bold color border, bold text, 8px border-radius.

### Cards & Containers
- **Card:** White `#FFFFFF` background, 2px solid bold color border, 12px border-radius, dynamic shadow.
- **Speech Bubble:** Rounded bubble with bold border, bright fill, tail pointing to speaker.
- **Starburst Frame:** Starburst or burst shape for special announcements.

### Inputs & Forms
- **Text Input:** White background, 2px solid Primary Blue `#4299E1` border, 8px border-radius.
- **Focus State:** Border thickens, adds glow effect.
- **Checkbox/Radio:** Bold colored squares/circles, thick border, bright fill.

### Navigation
- **Nav Bar:** White `#FFFFFF` background, bold bottom border or shadow.
- **Nav Item:** Bold text, hover adds an underline with motion.
- **Active Nav Item:** Bright colored pill with white text, bold shadow.

### Image Treatment
- Images should have bold borders or frames.
- Optional comic-style effects (starbursts, motion lines).
- High saturation, vibrant colors.
- Optional stylized cutout effect.

### Distinctive Components
- **Starburst Badge:** A starburst-shaped badge for announcements or discounts.
- **Speech Bubble Alert:** A comic-style speech bubble for notifications.
- **Confetti Decoration:** Small confetti pieces scattered around celebratory elements.
- **Exclamation Icon:** Bold exclamation marks for emphasis.
- **Squiggle Underline:** A wavy, energetic underline for emphasis.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px.
- **Grid & Container:**
  - Max container width: 1280px.
  - 12-column grid with 24px gutters.
  - Dynamic, slightly irregular layouts.
- **Whitespace Philosophy:** Energetic but not cluttered. Use whitespace to create impact around bold elements. The contrast between bold components and clean space creates visual energy.
- **Border Radius Scale:**
  - Small: 4px (small badges)
  - Medium: 8px (buttons, inputs)
  - Large: 12px (cards, panels)
  - XL: 16px (modals)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat | Base layer |
| 1 | `box-shadow: 2px 2px 0px rgba(0,0,0,0.2)` | Resting cards, hard offset shadow |
| 2 | `box-shadow: 4px 4px 0px rgba(0,0,0,0.25)` | Hover cards, dropdowns |
| 3 | `box-shadow: 6px 6px 0px rgba(0,0,0,0.3)` | Modals, emphasis |
| 4 | 3D text shadow + glow | Special emphasis, SFX |

- **Shadow Philosophy:** Hard, offset shadows (like a comic or sticker) rather than soft diffused shadows. This creates a bold, graphic, energetic feel. Use colored shadows for extra pop.

## 7. Do's and Don'ts

- **DO:**
  - Use bold, saturated colors.
  - Apply hard offset shadows for a comic/sticker feel.
  - Include dynamic shapes (starbursts, speech bubbles).
  - Use bold, dynamic typography with stroke effects.
  - Create energetic, slightly irregular layouts.
  - Add confetti, squiggles, and playful decorations.
- **DON'T:**
  - Use muted or pastel colors.
  - Apply soft, subtle shadows.
  - Create rigid, perfectly symmetrical layouts.
  - Use thin, light typography for headers.
  - Apply minimal or flat design aesthetics.
  - Use calm, serene imagery.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, bold elements stack, nav becomes bottom tab bar |
| Tablet | 640px - 1024px | 2-column grid, side panels become overlays |
| Desktop | > 1024px | Full multi-column grid, dynamic energetic layouts |

- **Touch Targets:** Minimum 48x48px for all interactive elements.
- **Collapsing Strategy:** Bold cards stack vertically. Navigation collapses into an energetic bottom tab bar with bold icons.
- **Image Behavior:** Images maintain aspect ratio, bold borders persist. Comic effects scale with the image.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#F56565` (Red), `#ECC94B` (Yellow), `#4299E1` (Blue), `#48BB78` (Green)
- Accents: `#FF69B4` (Neon Pink), `#9F7AEA` (Purple), `#ED8936` (Orange)
- Background: `#FFFFFF` (White), `#F7FAFC` (Light Gray)
- Text: `#1A202C` (Primary), `#4A5568` (Secondary)

### Example Component Prompts

1. **Pop Action Button:** "Create a button with a gradient from `#F56565` to `#FF69B4`, white bold text, a 2px dark outline, 8px border-radius, and a hard 3px offset shadow (`4px 4px 0px rgba(0,0,0,0.25)`)."
2. **Starburst Badge:** "Design a starburst-shaped badge with a bright yellow `#ECC94B` fill, dark bold text, and a thick dark outline. Add a hard offset shadow."
3. **Speech Bubble Card:** "Create a card styled like a comic speech bubble. White background, 2px bold colored border, 12px border-radius, with a triangular tail. Add a hard shadow."
4. **Pop Input Field:** "Design a text input with a white background, a 2px solid `#4299E1` border, 8px border-radius, and bold text. Focus state should add a glow."
5. **3D Header:** "Create a page header with bold display font, a gradient fill, a 2px stroke outline, and a 3D drop shadow (`3px 3px 0px rgba(0,0,0,0.3)`)."
6. **Confetti Banner:** "Design a banner with a bright gradient background, bold text with stroke effect, and small confetti decorations scattered around."

### Iteration Guide
1. **Start Bold:** Begin with bright, saturated colors and bold shapes.
2. **Add Shadows:** Introduce hard offset shadows for a comic/sticker feel.
3. **Dynamic Typography:** Apply stroke-text and 3D shadow effects to headers.
4. **Decorate:** Add starbursts, speech bubbles, confetti, and squiggles.
5. **Energy Check:** Ensure the layout feels dynamic and energetic. Avoid perfect symmetry.
