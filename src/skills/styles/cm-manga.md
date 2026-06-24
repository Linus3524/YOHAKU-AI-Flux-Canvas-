# Manga Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Expressive, dynamic, youthful, and versatile. Rooted in Japanese manga aesthetics, conveying energy, emotion, and storytelling.
- **Emotional Description:** Exciting, approachable, dramatic, and fun. It feels like opening a favorite manga chapter.
- **Key Characteristics:**
  - Clean, smooth lines with expressive weight variation.
  - Large, expressive visual elements and dynamic compositions.
  - Bright, vibrant colors with soft gradients on skin and materials.
  - Visual emotion indicators (sparkles, speed lines, motion effects).
  - High energy and movement in layouts.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Blue** | `#4299E1` | Main interactive elements, primary buttons, links |
| **Primary Orange** | `#ED8936` | Warm accents, tags, energetic highlights |
| **Primary Green** | `#68D391` | Success states, positive indicators, nature themes |
| **Secondary Pink** | `#F687B3` | Romantic accents, cute elements, shoujo vibes |
| **Interactive Purple** | `#9F7AEA` | Hover states, magical elements, focus rings |
| **Neutral 900** | `#1A202C` | Primary text, strong outlines |
| **Neutral 700** | `#4A5568` | Secondary text, captions |
| **Neutral 400** | `#A0AEC0` | Placeholder text, disabled states |
| **Neutral 200** | `#E2E8F0` | Dividers, subtle borders |
| **Neutral 100** | `#F7FAFC` | Subtle backgrounds |
| **Surface White** | `#FFFFFF` | Main page background, clean canvas |
| **Surface Warm** | `#FEEBC8` | Skin-tone inspired backgrounds, warm panels |
| **Semantic Success** | `#48BB78` | Success states, checkmarks |
| **Semantic Warning** | `#ECC94B` | Warnings, pending states |
| **Semantic Error** | `#F56565` | Errors, destructive actions, anger marks |
| **Semantic Info** | `#4299E1` | Informational callouts |
| **Accent Gold** | `#FFD700` | Stars, highlights, special rewards |

## 3. Typography Rules

- **Font Family:** A rounded, friendly sans-serif (e.g., Nunito, Quicksand, or Varela Round) for body text. A bold, dynamic display font for headers.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Dynamic Sans | 52px / 3.25rem | 900 | 1.1 | -0.02em | Bold, impactful, slight italic for energy |
| H1 | Dynamic Sans | 38px / 2.375rem | 800 | 1.2 | -0.01em | Section titles with visual flair |
| H2 | Sans-serif | 26px / 1.625rem | 700 | 1.3 | -0.005em | Sub-section headers |
| H3 | Sans-serif | 20px / 1.25rem | 600 | 1.4 | 0 | Card titles |
| Body | Sans-serif | 16px / 1rem | 400 | 1.6 | 0 | Main readable text |
| Body Small | Sans-serif | 14px / 0.875rem | 400 | 1.5 | 0.005em | Captions, metadata |
| Label | Sans-serif | 12px / 0.75rem | 700 | 1.4 | 0.05em | Uppercase, badges, tags |
| Button | Sans-serif | 16px / 1rem | 700 | 1 | 0.01em | Bold and actionable |
| Manga SFX | Display | 24px / 1.5rem | 900 | 1 | 0.05em | Sound effects, emphasis text |

- **Principles:** Use weight variation for emphasis. Allow for expressive, slightly oversized headers. Sound effect text should be bold, dynamic, and integrated visually.

## 4. Component Stylings

### Buttons
- **Primary:** Gradient from Primary Blue `#4299E1` to a lighter blue, 1.5px solid outline, 8px border-radius, subtle inner glow.
- **Secondary:** Flat Primary Orange `#ED8936`, 1.5px solid outline, 8px border-radius.
- **Danger:** Flat Semantic Error `#F56565`, 1.5px solid outline, 8px border-radius. Add "anger mark" icon option.
- **Action:** Dynamic shape (slanted rectangle or starburst), bright gradient fill, bold outline.

### Cards & Containers
- **Card:** White `#FFFFFF` background, 1.5px solid Neutral 200 outline, 12px border-radius, soft gradient shadow.
- **Panel:** Surface Warm `#FEEBC8` background, 1.5px solid outline, 8px border-radius.
- **Speech Bubble:** Rounded bubble for normal text, spiky/starburst for excitement. White fill, 2px outline.

### Inputs & Forms
- **Text Input:** White background, 1.5px solid Neutral 400 outline, 8px border-radius, soft inner shadow.
- **Focus State:** Outline changes to Primary Blue `#4299E1`, add a glow effect.
- **Checkbox/Radio:** Rounded squares/circles, 1.5px outline, gradient fill when checked.

### Navigation
- **Nav Bar:** White `#FFFFFF` background, 1px bottom border, slight gradient shadow.
- **Nav Item:** Text in Neutral 700, hover adds an underline with motion lines.
- **Active Nav Item:** Primary Blue `#4299E1` background pill, white text, rounded-full.

### Image Treatment
- Images can have rounded corners (12px).
- Optional sparkle or motion line overlays.
- Screen tone patterns (dot patterns) for shadows or atmospheric effects.

### Distinctive Components
- **Emotion Symbols:** Sweat drops, anger marks, hearts, sparkles as decorative icons.
- **Speed Lines:** Diagonal lines radiating from important elements for emphasis.
- **Screen Tone:** Dot-pattern overlays for shading and mood.
- **Manga Panels:** Rounded-corner containers with dynamic internal layouts.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px.
- **Grid & Container:**
  - Max container width: 1280px.
  - 12-column grid with 24px gutters.
  - Asymmetric layouts encouraged for dynamic feel.
- **Whitespace Philosophy:** Energetic and flowing. Whitespace is used to create movement and guide the eye dynamically across the page. Avoid rigid, perfectly symmetrical blocks.
- **Border Radius Scale:**
  - Small: 8px (buttons, inputs)
  - Medium: 12px (cards, small panels)
  - Large: 16px (modals, large containers)
  - Full: 9999px (pills, avatars, badges)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat | Base layer |
| 1 | `box-shadow: 0 2px 4px rgba(0,0,0,0.1)` | Cards, resting buttons |
| 2 | `box-shadow: 0 4px 8px rgba(0,0,0,0.12)` | Dropdowns, hover cards |
| 3 | `box-shadow: 0 8px 16px rgba(0,0,0,0.15)` | Modals, popovers |
| 4 | `box-shadow: 0 12px 24px rgba(0,0,0,0.2)` + glow | Special emphasis, SFX elements |

- **Shadow Philosophy:** Soft, diffused shadows that suggest lightness and energy. Use colored glows (blue, gold) for magical or special emphasis states.

## 7. Do's and Don'ts

- **DO:**
  - Use expressive, dynamic compositions with asymmetry.
  - Apply soft gradients on interactive elements and skin-toned areas.
  - Include visual emotion indicators (sparkles, motion lines) for emphasis.
  - Use rounded, friendly shapes (8px+ border-radius).
  - Vary line weight for emphasis and energy.
  - Use bright, vibrant colors.
- **DON'T:**
  - Use rigid, perfectly grid-aligned layouts (avoid excessive symmetry).
  - Apply harsh, sharp corners to interactive elements.
  - Use muted or overly desaturated colors.
  - Create static, lifeless compositions.
  - Use heavy, dark drop shadows without color.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, panels stack, nav becomes bottom tab bar |
| Tablet | 640px - 1024px | 2-column grid, side panels become overlays |
| Desktop | > 1024px | Full multi-column grid, dynamic asymmetric layouts |

- **Touch Targets:** Minimum 48x48px for all interactive elements.
- **Collapsing Strategy:** Manga panels stack vertically but maintain their rounded personality. Navigation collapses into a friendly bottom tab bar with icons.
- **Image Behavior:** Images maintain aspect ratio, rounded corners persist at all sizes. Screen tone overlays scale with the image.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#4299E1` (Blue), `#ED8936` (Orange), `#68D391` (Green)
- Background: `#FFFFFF` (White), `#FEEBC8` (Warm)
- Accents: `#FFD700` (Gold), `#F687B3` (Pink), `#9F7AEA` (Purple)
- Text: `#1A202C` (Primary), `#4A5568` (Secondary)

### Example Component Prompts

1. **Manga Action Button:** "Create a primary action button with a gradient from `#4299E1` to a lighter blue, white bold text, 1.5px dark outline, 8px border-radius, and a subtle inner glow. Hover state should add speed lines radiating from the button."
2. **Speech Bubble Card:** "Design a card styled like a manga speech bubble. White background, 2px dark outline, 16px border-radius on the main body with a small triangular tail. Add a soft gradient shadow."
3. **Emotion Badge:** "Create a badge component with a starburst shape, bright orange `#ED8936` gradient fill, white bold text, and a 2px outline. Include small sparkles around it."
4. **Manga Panel Layout:** "Design a content panel with a warm cream `#FEEBC8` background, 1.5px outline, 12px border-radius, and an asymmetric internal layout. Add a screen tone dot-pattern overlay in the corner for shading."
5. **Dynamic Navigation:** "Create a horizontal navigation bar with a white background and a subtle bottom shadow. Active item should be a rounded-full pill with Primary Blue `#4299E1` fill and white text. Hover items should have a small underline with motion lines."
6. **Sparkle Image Frame:** "Design an image container with 12px border-radius, a soft gradient shadow, and small sparkle/star decorations at the corners."

### Iteration Guide
1. **Start Vibrant:** Begin with bright, clean colors and rounded shapes.
2. **Add Energy:** Introduce asymmetry and dynamic compositions. Avoid perfect centering.
3. **Emotion Layer:** Add visual emotion indicators (sparkles, speed lines, screen tones) to key elements.
4. **Gradient Polish:** Apply soft gradients to interactive elements and skin-toned areas. Keep backgrounds mostly flat.
5. **Outline Refinement:** Ensure outlines are present but not overly heavy (1.5px is ideal). Use outline color to match the element's mood.
