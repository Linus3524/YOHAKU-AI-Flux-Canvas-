# XHS Study Notes Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Authentic, studious, organized, and approachable. A realistic handwritten photo aesthetic that mimics top student notes.
- **Emotional Description:** Nostalgic, diligent, trustworthy, and slightly messy but readable. It feels like peeking at a straight-A student's notebook.
- **Key Characteristics:**
  - Realistic photo perspective: top-down view of a study desk.
  - Dense, handwritten content filling the entire page.
  - Three-color annotation system: blue ballpoint, red pen, yellow highlighter.
  - Correction marks, margin notes, and cramped annotations.
  - Simple hand-drawn symbols (arrows, stars, checkmarks).
  - Authentic student handwriting with varying pen pressure.

## 2. Color Palette & Roles

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Blue** | `#1E3A5F` | Main content, blue ballpoint pen text |
| **Primary Black** | `#1A1A1A` | Secondary content, black ink text |
| **Accent Red** | `#CC0000` | Annotations, circles, underlines, corrections |
| **Highlight Yellow** | `#FFFF00` | Key terms, important highlights (50% opacity) |
| **Interactive Blue** | `#2B6CB0` | Links, hover states |
| **Neutral 900** | `#1A202C` | Strong text |
| **Neutral 700** | `#4A5568` | Secondary text |
| **Neutral 400** | `#A0AEC0` | Faded text, placeholder |
| **Neutral 200** | `#E2E8F0` | Lined paper lines |
| **Surface White** | `#FFFFFF` | Lined paper background |
| **Surface Lined** | `#FFFFFF` | White paper with horizontal rules |
| **Surface Cream** | `#FFFAF0` | Alternative paper color |
| **Semantic Success** | `#2F855A` | Success (green pen) |
| **Semantic Warning** | `#B7791F` | Warning (amber pen) |
| **Semantic Error** | `#CC0000` | Errors (red pen) |
| **Semantic Info** | `#1E3A5F` | Info (blue pen) |

## 3. Typography Rules

- **Font Family:** An authentic handwriting font (e.g., "Caveat", "Kalam", or "Indie Flower") for all text to mimic real student handwriting.
- **Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Handwriting | 36px / 2.25rem | 400 | 1.2 | 0.01em | Large title, blue pen |
| H1 | Handwriting | 28px / 1.75rem | 400 | 1.25 | 0.005em | Section title, blue pen, circled in red |
| H2 | Handwriting | 22px / 1.375rem | 400 | 1.3 | 0 | Sub-section, blue pen, red box |
| H3 | Handwriting | 18px / 1.125rem | 400 | 1.35 | 0 | Sub-topic, blue pen, red star |
| Body | Handwriting | 16px / 1rem | 400 | 1.5 | 0 | Main notes, blue ballpoint |
| Body Small | Handwriting | 14px / 0.875rem | 400 | 1.4 | 0.005em | Margin notes, cramped text |
| Label | Handwriting | 12px / 0.75rem | 400 | 1.3 | 0.01em | Tiny corner notes |
| Button | Handwriting | 16px / 1rem | 400 | 1 | 0.005em | Hand-drawn button look |
| Annotation | Handwriting | 14px / 0.875rem | 400 | 1.4 | 0 | Red pen annotations |

- **Principles:** All text should look handwritten. Vary font sizes to mimic real note-taking (large titles, small body, tiny margin notes). Use color coding consistently: blue for content, red for emphasis/corrections, yellow for highlights.

## 4. Component Stylings

### Buttons
- **Primary:** White paper background, 1px solid Blue `#1E3A5F` border (like a drawn box), blue text, 4px border-radius, handwritten font.
- **Secondary:** White paper background, 1px solid Red `#CC0000` border, red text, 4px border-radius.
- **Highlight:** Yellow `#FFFF00` background (50% opacity), black text, no border, like a highlighted section.
- **Ghost:** Transparent, blue text with underline on hover.

### Cards & Containers
- **Note Card:** White lined paper background, horizontal rules in Neutral 200, no border, 0px border-radius (like a paper sheet).
- **Paper Panel:** White or cream background, subtle paper texture, 0px border-radius.
- **Sticky Note:** Yellow `#FFFF00` background (70% opacity), 0px border-radius, slight rotation (like a real sticky note).

### Inputs & Forms
- **Text Input:** White lined paper background, 1px dashed Blue `#1E3A5F` border (like a drawn box), handwritten font.
- **Focus State:** Border becomes solid blue.
- **Checkbox/Radio:** Hand-drawn square/circle, blue border, blue fill with checkmark.

### Navigation
- **Nav Bar:** White paper background, 1px bottom border (like a drawn line).
- **Nav Item:** Handwritten text in Blue `#1E3A5F`, hover adds red underline.
- **Active Nav Item:** Blue text with a red circle around it (like a circled item in notes).

### Image Treatment
- Images should look like photos taped or glued into a notebook.
- Optional washi tape corners.
- Slight rotation for authenticity.
- Optional polaroid-style frame.

### Distinctive Components
- **Circled Text:** Text with a hand-drawn red circle around it for emphasis.
- **Underlined Text:** Text with a red or blue underline (wavy or straight).
- **Arrow Connector:** A hand-drawn arrow connecting related items.
- **Margin Note:** Tiny text squeezed into the margin with a line pointing to relevant content.
- **Highlighter Block:** A block of text with a yellow半透明 background.
- **Correction Mark:** A crossed-out word with a correction above it.

## 5. Layout Principles

- **Spacing System:** Base unit of 4px.
  - xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px, 2xl: 32px.
- **Grid & Container:**
  - Max container width: 900px (narrower for a notebook page feel).
  - Single or dual column layouts.
  - Dense content with minimal whitespace.
- **Whitespace Philosophy:** Dense and filled. Whitespace should be minimal, like a real notebook page. Content should fill the available space, with margin notes squeezed into edges.
- **Border Radius Scale:**
  - None: 0px (for paper sheets, lined backgrounds)
  - Small: 4px (for drawn boxes)
  - Medium: 8px (for small cards)

## 6. Depth & Elevation

- **Elevation Table:**

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat on paper | Base layer |
| 1 | Slight paper texture | Paper panels |
| 2 | Sticky note with slight rotation | Notes, reminders |
| 3 | Layered paper (offset) | Emphasis, overlays |

- **Shadow Philosophy:** Minimal to no shadows. Depth is achieved through paper layering, sticky note rotation, and texture rather than digital shadows. The aesthetic should feel physical and analog.

## 7. Do's and Don'ts

- **DO:**
  - Use handwriting fonts for all text.
  - Keep content dense and filled, like real notes.
  - Use the three-color system consistently (blue, red, yellow).
  - Include simple hand-drawn symbols (arrows, stars, checkmarks).
  - Add correction marks and margin notes for authenticity.
  - Use lined paper backgrounds.
- **DON'T:**
  - Use standard digital fonts.
  - Leave too much whitespace.
  - Use complex emojis or digital icons.
  - Create neat, tidy layouts.
  - Add colorful decorations or cartoon elements.
  - Use gradients, shadows, or modern UI effects.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, dense notes stack, nav simplifies |
| Tablet | 640px - 1024px | Dual column possible, side notes in margins |
| Desktop | > 1024px | Full notebook page width, margin notes visible |

- **Touch Targets:** Minimum 44x44px for all interactive elements.
- **Collapsing Strategy:** Note sections stack vertically. Margin notes may move inline on smaller screens.
- **Image Behavior:** Images maintain aspect ratio, paper/tape frames scale down. Photos should remain slightly rotated for authenticity.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary Content: `#1E3A5F` (Blue Ballpoint), `#1A1A1A` (Black Ink)
- Annotations: `#CC0000` (Red Pen)
- Highlights: `#FFFF00` at 50% opacity (Yellow Highlighter)
- Background: `#FFFFFF` (White Paper), `#FFFAF0` (Cream Paper)
- Rules: `#E2E8F0` (Lined Paper Lines)

### Example Component Prompts

1. **Handwritten Button:** "Create a button that looks like a hand-drawn box on paper. White background, 1px solid `#1E3A5F` border (like a pen drawing), blue handwritten text, 4px border-radius."
2. **Note Paper Card:** "Design a card with a white lined paper background (horizontal `#E2E8F0` rules), handwritten text in blue `#1E3A5F`, and a red `#CC0000` circled title. No border-radius."
3. **Sticky Note:** "Create a sticky note component with a yellow `#FFFF00` background at 70% opacity, handwritten text, 0px border-radius, and a slight rotation (2-3 degrees)."
4. **Highlighted Text Block:** "Design a text block with a yellow `#FFFF00` background at 50% opacity (like a highlighter), handwritten text, and no border."
5. **Margin Note:** "Create a small margin note with tiny handwritten text in blue, a thin line connecting it to the main content, squeezed into the edge of the page."
6. **Annotated Image:** "Design an image container that looks like a photo taped into a notebook. Slight rotation, washi tape corners, with a red pen arrow pointing to it and a small annotation."

### Iteration Guide
1. **Start with Paper:** Begin with a white or cream paper background with horizontal rules.
2. **Handwrite Everything:** Apply handwriting fonts to all text elements.
3. **Color Code:** Use blue for main content, red for annotations, yellow for highlights.
4. **Add Density:** Fill the space with content. Add margin notes, arrows, and symbols.
5. **Authentic Details:** Add correction marks, underlines, circles, and slight rotations for a real notebook feel.
