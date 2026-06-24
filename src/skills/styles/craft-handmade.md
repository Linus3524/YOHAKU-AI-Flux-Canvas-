# Craft Handmade Design System

A warm, organic design language inspired by hand-drawn illustration and paper craft aesthetics. Every element feels touched by human hands — imperfect lines, layered paper depth, and a cozy, approachable personality that makes complex information feel friendly and accessible.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:** Warm, approachable, artisanal, playful yet informative. Like a beloved children's book or a handmade zine.

**Emotional Description:** The design evokes the comfort of a craft table on a Sunday afternoon — scissors, colored paper, and imagination. It feels personal, authentic, and delightfully imperfect.

**Key Characteristics:**
- Hand-drawn or cut-paper quality on every element
- Organic, slightly imperfect shapes — no perfect circles or straight lines
- Layered depth created through paper shadows and overlapping layers
- Cartoon/illustrated aesthetic strictly enforced — zero photorealism
- Warm, soft color palette reminiscent of craft supplies
- Ample whitespace with clean, breathable compositions
- Keywords and core concepts visually highlighted

---

## 2. Color Palette & Roles

### Primary
| Name | Hex | Usage |
|------|-----|-------|
| Craft Cream | `#FFF8F0` | Primary background, paper base |
| Warm Coral | `#E8927C` | Primary accent, CTAs, key highlights |
| Soft Teal | `#7EC8C8` | Secondary accent, interactive elements |

### Secondary
| Name | Hex | Usage |
|------|-----|-------|
| Paper Beige | `#F5F0E6` | Card backgrounds, textured surfaces |
| Construction Orange | `#F4A261` | Highlights, badges, emphasis |
| Sage Green | `#A8C686` | Success states, nature elements |

### Interactive
| Name | Hex | Usage |
|------|-----|-------|
| Button Primary | `#E8927C` | Primary action buttons |
| Button Hover | `#D67D68` | Button hover state |
| Link Blue | `#6B9BD1` | Text links, navigation |
| Focus Ring | `#E8927C` | Keyboard focus indicators |

### Neutral
| Name | Hex | Usage |
|------|-----|-------|
| Ink Brown | `#4A3F35` | Primary text, headings |
| Warm Gray | `#8B7E74` | Secondary text, captions |
| Light Gray | `#D4CFC7` | Dividers, borders, disabled states |

### Surface
| Name | Hex | Usage |
|------|-----|-------|
| Paper White | `#FFFCF8` | Elevated cards, modals |
| Kraft Brown | `#C4A882` | Darker paper accents, footer |
| Shadow Gray | `rgba(74, 63, 53, 0.15)` | Paper drop shadows |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#A8C686` | Positive feedback, completed states |
| Warning | `#F4A261` | Alerts, caution |
| Error | `#E07A5F` | Errors, destructive actions |
| Info | `#6B9BD1` | Informational messages |

---

## 3. Typography Rules

**Font Family:**
- **Headings:** "Patrick Hand" or "Comic Neue" — hand-drawn, casual character
- **Body:** "Nunito" or "Quicksand" — rounded, friendly, highly readable
- **Accent/Labels:** "Caveat" or "Permanent Marker" — for emphasis and keywords

### Hierarchy Table

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Patrick Hand | 48px | 700 | 1.1 | -0.02em | Hero titles, page headers |
| H1 | Patrick Hand | 36px | 700 | 1.2 | -0.01em | Section titles |
| H2 | Patrick Hand | 28px | 700 | 1.3 | 0 | Subsection headers |
| H3 | Nunito | 22px | 700 | 1.4 | 0 | Card titles, feature names |
| Body | Nunito | 16px | 400 | 1.6 | 0.01em | Paragraph text |
| Body Small | Nunito | 14px | 400 | 1.5 | 0.01em | Captions, metadata |
| Label | Caveat | 14px | 700 | 1.4 | 0.02em | Tags, badges, annotations |
| Button | Nunito | 16px | 700 | 1 | 0.02em | All button text |
| Keyword | Permanent Marker | 18px | 400 | 1.3 | 0.01em | Highlighted terms |

### Principles
- Slight rotation (-1deg to +1deg) on large display text for hand-drawn feel
- Keywords emphasized with larger, bolder, or accent-colored text
- Consistent line weight in hand-drawn style — no ultra-thin strokes
- Text never perfectly aligned to pixel grid; subtle organic offset

---

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#E8927C`
- Text: `#FFFCF8`
- Border: 2px solid `#D67D68`
- Border-radius: 12px (slightly irregular, not perfectly round)
- Padding: 12px 24px
- Shadow: 3px 3px 0 `#D4CFC7` (paper offset shadow)
- Hover: translate(-1px, -1px), shadow intensifies
- Active: translate(2px, 2px), shadow disappears

**Secondary Button**
- Background: transparent
- Border: 2px dashed `#E8927C`
- Text: `#E8927C`
- Border-radius: 12px
- Hover: Background fills with `#FFF8F0`

**Icon Button**
- Circular but imperfect (slight wobble)
- Hand-drawn icon style
- 44px minimum touch target

### Cards & Containers

**Paper Card**
- Background: `#FFFCF8`
- Border: 1px solid `#D4CFC7`
- Border-radius: 8px (slightly irregular)
- Shadow: 4px 4px 0 `rgba(74, 63, 53, 0.1)`
- Padding: 24px
- Optional: Slight rotation (-0.5deg to +0.5deg)

**Layered Card Stack**
- Multiple cards slightly offset (2px, 4px, 6px)
- Each layer slightly darker or different paper tone
- Creates depth like stacked construction paper

**Note Card**
- Background: `#FFF8F0`
- Border-left: 4px solid `#F4A261`
- Padding: 16px 20px
- Slight tape/sticker effect at corners

### Inputs & Forms

**Text Input**
- Background: `#FFFCF8`
- Border: 2px solid `#D4CFC7`
- Border-radius: 10px
- Padding: 12px 16px
- Focus: Border color `#E8927C`, hand-drawn focus ring
- Placeholder: `#8B7E74`, italic

**Textarea**
- Same as text input
- Min-height: 120px
- Resize: vertical only

**Checkbox**
- Custom hand-drawn square (slightly imperfect)
- Checkmark: hand-drawn stroke, `#A8C686`
- Unchecked: empty square with `#D4CFC7` border

**Radio Button**
- Custom hand-drawn circle
- Fill: `#E8927C` with organic edge

### Navigation

**Top Nav**
- Background: `#FFF8F0` with subtle paper texture
- Border-bottom: 2px solid `#D4CFC7`
- Links: `#4A3F35`, hover underline in `#E8927C`
- Active: `#E8927C` with hand-drawn underline

**Sidebar Nav**
- Background: `#F5F0E6`
- Items: Padding 12px 16px
- Active item: Left border 4px `#E8927C`, background `#FFF8F0`
- Hover: Background `#FFFCF8`

### Image Treatment
- All images must be illustrations or cartoons — strictly no photorealism
- Images have subtle paper texture overlay
- Optional: Slight rotation, torn-paper edge mask
- Drop shadow: 4px 4px 0 `rgba(74, 63, 53, 0.12)`

### Distinctive Components

**Paper Tape / Sticker**
- Background: `rgba(255, 252, 248, 0.9)`
- Border: none
- Slight rotation
- Subtle shadow
- Used for labels, tags, annotations

**Hand-Drawn Divider**
- SVG wavy or zigzag line
- Color: `#D4CFC7` or `#E8927C`
- Stroke-width: 2px
- Organic, not perfectly straight

**Scissors Cut Edge**
- Decorative zigzag border on certain cards
- Creates "cut from paper" effect

---

## 5. Layout Principles

### Spacing System
| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps, icon padding |
| sm | 8px | Inline spacing, small gaps |
| md | 16px | Standard component padding |
| lg | 24px | Card padding, section gaps |
| xl | 32px | Section margins |
| 2xl | 48px | Major section separations |
| 3xl | 64px | Page-level spacing |

### Grid & Container
- Max container width: 1200px
- Grid: 12-column with 24px gutters
- Content padding: 24px (mobile), 48px (desktop)
- Asymmetric layouts encouraged — not everything must align perfectly

### Whitespace Philosophy
- Generous whitespace creates breathing room
- Elements can have slight offsets from grid for organic feel
- Cluster related items; separate unrelated ones with ample space
- White/cream space is as important as content

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| sm | 6px | Small buttons, tags |
| md | 10px | Inputs, small cards |
| lg | 16px | Cards, modals |
| xl | 24px | Large containers, hero sections |
| full | 9999px | Pill badges (but slightly imperfect) |

---

## 6. Depth & Elevation

### Elevation Table

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat, no shadow | Background layers, inactive elements |
| 1 | 2px 2px 0 `rgba(74,63,53,0.08)` | Subtle raised elements, hover states |
| 2 | 4px 4px 0 `rgba(74,63,53,0.12)` | Cards, buttons, primary interactive |
| 3 | 6px 6px 0 `rgba(74,63,53,0.15)` | Elevated cards, dropdowns |
| 4 | 8px 8px 0 `rgba(74,63,53,0.18)` | Modals, popovers, top layers |

### Shadow Philosophy
Shadows in this system are **offset, hard shadows** — not soft, blurred shadows. They mimic the shadow cast by a piece of paper slightly lifted above another. This creates a tactile, paper-craft depth effect. Shadows never use blur radius; they use solid offset shadows for that authentic cut-paper feel.

---

## 7. Do's and Don'ts

### Do
- Use hand-drawn or illustrated elements exclusively
- Maintain slightly imperfect, organic shapes throughout
- Apply paper texture overlays for tactile feel
- Use offset hard shadows to create paper-layer depth
- Highlight keywords with larger, bolder, or accent-colored text
- Include playful doodles, annotations, and decorative elements
- Use ample whitespace for clean, breathable layouts
- Apply subtle rotation (-1deg to +1deg) to cards and images
- Replace any realistic imagery with cartoon/illustrated equivalents

### Don't
- Use photorealistic images or 3D renders
- Create perfect geometric shapes or pixel-perfect alignment
- Apply soft, blurred shadows — always use hard offset shadows
- Use gradients or glossy effects
- Add digital-looking clean lines or sharp corners
- Use thin, delicate strokes — maintain consistent medium weight
- Overcrowd layouts — whitespace is essential
- Mix illustration styles — maintain consistency

---

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 640px | Single column, stacked layout |
| Tablet | 640px - 1024px | 2-column grid, adjusted spacing |
| Desktop | 1024px - 1440px | Full 12-column grid |
| Wide | > 1440px | Centered content, max-width container |

### Touch Targets
- Minimum: 44px x 44px for all interactive elements
- Buttons: Full-width on mobile, auto-width on desktop
- Input height: 48px minimum on mobile

### Collapsing Strategy
- Sidebar collapses to bottom sheet on mobile
- Navigation becomes hamburger menu below 768px
- Cards stack vertically with full width
- Paper shadow offsets reduce by 50% on mobile for space efficiency

### Image Behavior
- Illustrations scale proportionally
- Maintain aspect ratio at all breakpoints
- Slight rotation removed on mobile for readability
- Shadows simplified on smaller screens

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#FFF8F0` (Craft Cream)
- Primary: `#E8927C` (Warm Coral)
- Secondary: `#7EC8C8` (Soft Teal)
- Text: `#4A3F35` (Ink Brown)
- Paper shadow: `rgba(74, 63, 53, 0.12)`

### Example Component Prompts

1. **Hand-Drawn Button:** "Create a primary button with Warm Coral (#E8927C) background, white text, 2px solid darker coral border, 12px border-radius with slight irregularity, and a 3px 3px 0 offset hard shadow in Shadow Gray. On hover, shift up 1px and intensify shadow. Hand-drawn aesthetic, no perfect geometry."

2. **Paper Card:** "Design a card component with Paper White (#FFFCF8) background, 1px Light Gray border, 8px slightly irregular border-radius, 24px padding, and a 4px 4px 0 offset shadow. Add optional slight rotation of +/-0.5deg for organic feel."

3. **Layered Paper Stack:** "Create a visual element showing three overlapping paper layers in Craft Cream, Paper Beige, and Kraft Brown, each offset by 2px with offset hard shadows. Torn or cut edges visible. Hand-crafted aesthetic."

4. **Hand-Drawn Input:** "Design a text input with Paper White background, 2px Light Gray border, 10px border-radius, 12px 16px padding. Focus state uses Warm Coral border with a hand-drawn focus ring. Placeholder text in Warm Gray italic."

5. **Keyword Highlight:** "Style a highlighted keyword using Permanent Marker font at 18px, Warm Coral color, slight rotation of -1deg, with a subtle paper tape background behind it."

6. **Note Card with Tape:** "Create a note card with Craft Cream background, left border 4px Construction Orange, 16px 20px padding. Add a paper tape sticker at the top-left corner, slightly rotated, with semi-transparent white background."

7. **Hand-Drawn Navigation:** "Design a top navigation bar with Craft Cream background, subtle paper texture, 2px Light Gray bottom border. Links in Ink Brown with hand-drawn underline on hover in Warm Coral. Active link has Warm Coral color with organic underline."

### Iteration Guide

1. **Start with the paper base:** Always establish the cream/off-white paper background first before adding elements.
2. **Apply offset shadows before colors:** Hard offset shadows are the defining depth mechanism — apply them consistently before fine-tuning colors.
3. **Check for perfect geometry:** Intentionally introduce slight imperfections — wobble in circles, slight bends in lines, irregular spacing.
4. **Verify illustration consistency:** Ensure all imagery is hand-drawn/cartoon style — replace any photorealistic elements immediately.
5. **Add texture last:** Apply subtle paper texture overlays as a final pass for tactile authenticity.
6. **Validate whitespace:** Ensure layouts breathe — craft aesthetic requires generous spacing, not cramped designs.
7. **Test rotation subtly:** Apply +/-0.5deg to 1deg rotation on cards and images, but remove on mobile for readability.
