# Ligne Claire Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Timeless, accessible, educational, and narrative-driven. Rooted in the classic European comic tradition (Hergé's Tintin), conveying clarity and trustworthiness.
- **Emotional Description:** Nostalgic yet fresh, clean and orderly, inviting and warm. It feels like a well-loved storybook.
- **Key Characteristics:**
  - Clean, uniform outlines with consistent weight.
  - Flat color fills without gradients or complex shading.
  - Sharp, precise edges on all UI elements.
  - High contrast between simplified foreground elements and detailed backgrounds.
  - A sense of handcrafted precision and deliberate simplicity.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Blue** | `#3182CE` | Main interactive elements, primary buttons, key highlights |
| **Primary Red** | `#E53E3E` | Alerts, important badges, accent strokes |
| **Primary Yellow** | `#ECC94B` | Stars, ratings, highlights, secondary accents |
| **Secondary Orange** | `#ED8936` | Warm accents, tags, secondary interactive states |
| **Interactive Blue** | `#4299E1` | Links, hover states, focus rings |
| **Neutral 900** | `#1A202C` | Primary text, strong outlines |
| **Neutral 700** | `#4A5568` | Secondary text, inactive states |
| **Neutral 400** | `#A0AEC0` | Placeholder text, disabled borders |
| **Neutral 200** | `#E2E8F0` | Dividers, subtle borders, separators |
| **Neutral 100** | `#F7FAFC` | Subtle backgrounds, alternating rows |
| **Surface Light** | `#FFFAF0` | Main page background, cream paper feel |
| **Surface Sky** | `#BEE3F8` | Info banners, atmospheric sections, sky panels |
| **Semantic Success** | `#48BB78` | Success states, checkmarks, positive feedback |
| **Semantic Warning** | `#ECC94B` | Warnings, pending states |
| **Semantic Error** | `#E53E3E` | Errors, destructive actions |
| **Semantic Info** | `#3182CE` | Informational callouts |

## 3. Typography Rules

- **Font Family:** A clean, geometric sans-serif (e.g., Inter, Roboto, or a comic-friendly rounded font like Nunito) to echo the clean lines. Hand-drawn text style for decorative headers.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Sans-serif | 48px / 3rem | 800 | 1.1 | -0.02em | Hand-drawn feel, flat color fill |
| H1 | Sans-serif | 36px / 2.25rem | 700 | 1.2 | -0.01em | Bold, clear, uniform stroke |
| H2 | Sans-serif | 28px / 1.75rem | 700 | 1.3 | -0.005em | Section headers |
| H3 | Sans-serif | 22px / 1.375rem | 600 | 1.4 | 0 | Sub-section headers |
| Body | Sans-serif | 16px / 1rem | 400 | 1.6 | 0 | Main readable text |
| Body Small | Sans-serif | 14px / 0.875rem | 400 | 1.5 | 0.005em | Captions, metadata |
| Label | Sans-serif | 12px / 0.75rem | 600 | 1.4 | 0.05em | Uppercase, badges, tags |
| Button | Sans-serif | 16px / 1rem | 600 | 1 | 0.01em | Clear and actionable |

- **Principles:** Maintain high readability. Avoid overly decorative fonts for body text. Use consistent weight and spacing.

## 4. Component Stylings

### Buttons
- **Primary:** Flat fill of Primary Blue `#3182CE`, 2px solid black outline (`#1A202C`), 4px border-radius, no shadow.
- **Secondary:** Flat fill of Primary Yellow `#ECC94B`, 2px solid black outline, 4px border-radius.
- **Danger:** Flat fill of Primary Red `#E53E3E`, 2px solid black outline, 4px border-radius.
- **Ghost:** Transparent fill, 2px solid black outline, 4px border-radius.

### Cards & Containers
- **Card:** Flat fill of Surface Light `#FFFAF0`, 2px solid black outline (`#1A202C`), 4px border-radius, no shadow.
- **Panel:** Flat fill of white `#FFFFFF`, 2px solid black outline, 0px border-radius (sharp corners for a panel feel).

### Inputs & Forms
- **Text Input:** Flat fill of white `#FFFFFF`, 2px solid Neutral 400 `#A0AEC0` outline, 4px border-radius.
- **Focus State:** Outline changes to Interactive Blue `#4299E1`, 2px solid.
- **Checkbox/Radio:** 2px solid black outline, flat fill when checked.

### Navigation
- **Nav Bar:** Flat fill of Surface Light `#FFFAF0`, 2px solid black bottom border.
- **Nav Item:** Text in Neutral 900, hover state adds a flat underline in Primary Blue.
- **Active Nav Item:** Flat fill of Primary Blue `#3182CE` with white text, 2px black outline.

### Image Treatment
- All images should have a 2px solid black outline.
- No rounded corners on images (sharp edges) unless nested inside a card.
- Flat color overlays if needed, no gradients.

### Distinctive Components
- **Speech Bubbles:** Flat white fill, 2px black outline, sharp tail, 4px border-radius on the bubble body.
- **Comic Panels:** White or light cream background, thick 3px black borders, sharp 90-degree corners.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px.
- **Grid & Container:**
  - Max container width: 1200px.
  - 12-column grid with 24px gutters.
  - Panels and cards align strictly to the grid.
- **Whitespace Philosophy:** Structured and intentional. Whitespace is used to create clear panel separation, not for a "breathing" minimalist feel. Elements are grouped tightly within their outlined containers.
- **Border Radius Scale:**
  - None: 0px (for panels, comic frames)
  - Small: 4px (for buttons, inputs, small cards)
  - Medium: 8px (for larger cards, modals)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat, no shadow | Base layer, background panels |
| 1 | 2px solid black outline offset (simulated) | Hover on cards, active buttons |
| 2 | 4px solid black outline offset (simulated) | Dropdowns, popovers, floating elements |

- **Shadow Philosophy:** Elevation is achieved through **outline offset** (a hard, flat shadow) rather than blurred drop shadows. This mimics the layered feel of comic panels. No Gaussian shadows are used.

## 7. Do's and Don'ts

- **DO:**
  - Use flat colors without gradients.
  - Apply uniform, clean 2px outlines to all interactive elements and containers.
  - Keep line weight consistent throughout the interface.
  - Use sharp corners (0px radius) for large panel-like containers.
  - Ensure high contrast between text and background.
  - Use the outline-offset technique for hover/active states.
- **DON'T:**
  - Use gradients, drop shadows, or blur effects.
  - Use rounded corners on main layout panels (keep them sharp).
  - Vary outline weights inconsistently.
  - Use photorealistic images without a clear outline or flat treatment.
  - Add glossy or glassmorphism effects.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, panels stack vertically, nav collapses to hamburger |
| Tablet | 640px - 1024px | 2-column grid, sidebars become overlays |
| Desktop | > 1024px | Full 12-column grid, multi-panel layouts |

- **Touch Targets:** Minimum 44x44px for all interactive elements.
- **Collapsing Strategy:** Comic panels stack vertically. Navigation collapses into a bottom bar or hamburger menu.
- **Image Behavior:** Images maintain aspect ratio, outlined containers scale down, text reflows within sharp-cornered panels.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: `#3182CE` (Blue), `#E53E3E` (Red), `#ECC94B` (Yellow)
- Background: `#FFFAF0` (Cream), `#FFFFFF` (White)
- Outlines: `#1A202C` (Black)
- Text: `#1A202C` (Primary), `#4A5568` (Secondary)

### Example Component Prompts

1. **Comic Panel Card:** "Create a card component with a flat cream background `#FFFAF0`, a thick 3px solid black outline `#1A202C`, sharp 0px border-radius, and internal padding of 16px. No shadows."
2. **Primary Action Button:** "Design a button with a flat blue fill `#3182CE`, white text, a 2px solid black outline, and a 4px border-radius. Hover state should shift the button 2px down and right with a matching outline-offset shadow."
3. **Speech Bubble Alert:** "Create an alert component shaped like a speech bubble. Flat white background, 2px black outline, sharp tail pointing down. Text should be black `#1A202C`."
4. **Navigation Panel:** "Design a sidebar navigation panel. Flat cream background `#FFFAF0`, 2px black right border, sharp corners. Active item has a flat blue `#3182CE` background with white text and a 2px black outline."
5. **Image Frame:** "Create an image container with a flat white background, a 2px solid black outline, and 0px border-radius. The image inside should fill the frame completely."
6. **Form Input:** "Design a text input with a flat white background, a 2px solid gray `#A0AEC0` outline, and 4px border-radius. Focus state changes the outline to blue `#4299E1`."

### Iteration Guide
1. **Start Flat:** Always begin with flat colors and solid outlines. Do not introduce gradients or shadows in the first iteration.
2. **Outline Check:** Ensure every container and interactive element has a clear, uniform outline.
3. **Color Audit:** Verify that colors are used flatly. If a gradient appears, replace it with a solid color from the palette.
4. **Radius Review:** Check border radii. Buttons and small cards can be slightly rounded (4px), but main panels and comic frames must remain sharp.
5. **Shadow Replacement:** If depth is needed, use the outline-offset technique (a hard, flat shadow) instead of CSS box-shadow.
