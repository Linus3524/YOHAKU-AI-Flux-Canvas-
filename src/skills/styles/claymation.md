# Claymation Design System

A tactile, three-dimensional design language inspired by stop-motion clay animation. Every element feels sculpted by hand — rounded, imperfect forms with visible fingerprint textures, soft shadows, and a playful, approachable warmth that makes interfaces feel like miniature clay worlds.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:** Playful, tactile, handcrafted, whimsical, approachable. Like a beloved stop-motion film come to life.

**Emotional Description:** The design evokes the charm of a miniature clay world — soft, squishy forms with gentle imperfections that invite touch. It feels nostalgic yet fresh, like opening a fresh block of modeling clay.

**Key Characteristics:**
- Clay/plasticine texture on all surfaces
- Visible fingerprint marks and thumbprint imperfections
- Rounded, sculpted forms — no sharp edges
- Soft, diffused shadows from clay depth
- Stop-motion staging aesthetic
- Miniature set charm
- Saturated but slightly muted clay colors
- Shiny highlights on raised clay surfaces

---

## 2. Color Palette & Roles

### Primary
| Name | Hex | Usage |
|------|-----|-------|
| Clay Red | `#D4574A` | Primary accent, CTAs, key elements |
| Clay Blue | `#5B8DB8` | Secondary accent, interactive elements |
| Clay Yellow | `#E8C547` | Highlights, badges, emphasis |

### Secondary
| Name | Hex | Usage |
|------|-----|-------|
| Clay Green | `#6BAF72` | Success states, nature elements |
| Clay Orange | `#E8913A` | Warnings, energy, secondary highlights |
| Clay Purple | `#8B7CB8` | Tertiary accent, creative elements |

### Interactive
| Name | Hex | Usage |
|------|-----|-------|
| Button Primary | `#D4574A` | Primary action buttons |
| Button Hover | `#C24A3E` | Button hover state |
| Link Blue | `#5B8DB8` | Text links, navigation |
| Focus Ring | `#E8C547` | Keyboard focus indicators |

### Neutral
| Name | Hex | Usage |
|------|-----|-------|
| Dark Clay | `#3D3530` | Primary text, headings |
| Studio Gray | `#7A726A` | Secondary text, captions |
| Light Clay | `#C4B8AE` | Dividers, borders, disabled states |

### Surface
| Name | Hex | Usage |
|------|-----|-------|
| Studio Backdrop | `#E8E2DC` | Primary background, neutral studio |
| Clay White | `#F5F0EB` | Elevated cards, modals |
| Shadow Brown | `rgba(61, 53, 48, 0.2)` | Soft clay shadows |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#6BAF72` | Positive feedback, completed states |
| Warning | `#E8913A` | Alerts, caution |
| Error | `#C94C4C` | Errors, destructive actions |
| Info | `#5B8DB8` | Informational messages |

---

## 3. Typography Rules

**Font Family:**
- **Headings:** "Fredoka One" or "Baloo 2" — rounded, chunky, playful
- **Body:** "Nunito" or "Varela Round" — rounded, friendly, highly readable
- **Accent/Labels:** "Bangers" or "Chewy" — for emphasis and playful text

### Hierarchy Table

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Fredoka One | 52px | 400 | 1.1 | 0.02em | Hero titles, page headers |
| H1 | Fredoka One | 38px | 400 | 1.2 | 0.01em | Section titles |
| H2 | Fredoka One | 30px | 400 | 1.25 | 0.01em | Subsection headers |
| H3 | Nunito | 24px | 700 | 1.3 | 0 | Card titles, feature names |
| Body | Nunito | 16px | 400 | 1.6 | 0.01em | Paragraph text |
| Body Small | Nunito | 14px | 400 | 1.5 | 0.01em | Captions, metadata |
| Label | Nunito | 12px | 700 | 1.4 | 0.03em | Tags, badges, uppercase |
| Button | Fredoka One | 16px | 400 | 1 | 0.02em | All button text |
| Accent | Chewy | 20px | 400 | 1.3 | 0.01em | Playful highlights |

### Principles
- All fonts must have rounded terminals — no sharp serif edges
- Text appears slightly "extruded" or dimensional
- Headings have subtle clay texture overlay
- Letter-spacing slightly wider for playful, open feel
- Avoid thin font weights — medium to bold only

---

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#D4574A` with clay texture overlay
- Text: `#F5F0EB`
- Border: none (clay has no borders)
- Border-radius: 24px (very rounded, pill-like but organic)
- Padding: 14px 28px
- Shadow: 0 6px 0 `#A63C32` (clay depth shadow)
- Highlight: Top edge lighter `#E07A6F` for 3D clay effect
- Hover: translateY(-2px), shadow grows
- Active: translateY(4px), shadow compresses

**Secondary Button**
- Background: `#5B8DB8` with clay texture
- Same shadow and highlight treatment as primary
- Text: `#F5F0EB`

**Icon Button**
- Circular, very rounded (50% but slightly imperfect)
- Clay texture with thumbprint detail
- 48px minimum touch target
- Shadow: 0 4px 0 darker shade

### Cards & Containers

**Clay Card**
- Background: `#F5F0EB` with subtle clay texture
- Border: none
- Border-radius: 20px (soft, rounded corners)
- Shadow: 0 8px 0 `rgba(61, 53, 48, 0.15)`
- Padding: 28px
- Highlight: Top-left edge slightly lighter for 3D form
- Slight irregularity in border-radius for handmade feel

**Sculpted Panel**
- Background: `#E8E2DC`
- Border-radius: 24px
- Shadow: 0 12px 0 `rgba(61, 53, 48, 0.12)`
- Used for major content sections
- Appears "pressed" into the surface

**Badge / Pill**
- Background: `#E8C547`
- Border-radius: 999px (fully rounded)
- Padding: 6px 14px
- Shadow: 0 3px 0 `#C4A83A`
- Text: `#3D3530`

### Inputs & Forms

**Text Input**
- Background: `#F5F0EB`
- Border: 3px solid `#C4B8AE` (thick, clay-like border)
- Border-radius: 16px
- Padding: 14px 18px
- Focus: Border color `#5B8DB8`, subtle glow
- Placeholder: `#7A726A`
- Appears "indented" into surface

**Textarea**
- Same as text input
- Min-height: 140px
- Resize: vertical only

**Checkbox**
- Custom clay square with rounded corners (6px)
- Checkmark: sculpted tick in `#6BAF72`
- Unchecked: empty with `#C4B8AE` border
- Shadow: 0 2px 0 `rgba(61,53,48,0.1)`

**Radio Button**
- Custom clay circle
- Fill: `#D4574A` with clay texture
- Shadow for 3D depth

### Navigation

**Top Nav**
- Background: `#E8E2DC` with subtle studio backdrop texture
- Border-bottom: 4px solid `#C4B8AE` (thick clay border)
- Links: `#3D3530`, hover color `#D4574A`
- Active: `#D4574A` with clay underline
- Height: 64px

**Sidebar Nav**
- Background: `#E8E2DC`
- Items: Padding 14px 18px
- Active item: Background `#F5F0EB`, left border 6px `#D4574A`
- Hover: Background `#F5F0EB`
- Border-radius on items: 12px

### Image Treatment
- All images have clay texture overlay
- Rounded corners (16px+)
- Soft shadow beneath
- Optional: Slight "thumbprint" texture detail
- Characters/objects appear as clay sculptures

### Distinctive Components

**Clay Blob / Shape**
- Organic, amorphous shapes with clay texture
- Used as decorative backgrounds
- Soft shadows for depth
- Colors from primary/secondary palette

**Fingerprint Texture Overlay**
- Subtle repeating fingerprint pattern
- Low opacity (5-10%)
- Applied to all clay-colored surfaces
- Creates authentic clay feel

**Sculpted Divider**
- Thick, rounded line (4px)
- Color: `#C4B8AE`
- Slight wave or organic curve
- Shadow beneath for depth

**Miniature Set Element**
- Small decorative clay objects (stars, hearts, clouds)
- Used as accents around content
- Each with clay texture and soft shadow

---

## 5. Layout Principles

### Spacing System
| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps |
| sm | 8px | Inline spacing |
| md | 16px | Standard component padding |
| lg | 24px | Card padding |
| xl | 32px | Section gaps |
| 2xl | 48px | Major section separations |
| 3xl | 64px | Page-level spacing |

### Grid & Container
- Max container width: 1280px
- Grid: 12-column with 24px gutters
- Content padding: 20px (mobile), 40px (desktop)
- Layouts feel "staged" like a miniature set

### Whitespace Philosophy
- Generous spacing creates a "studio" feel
- Elements have room to breathe like sculptures on a table
- Cluster related items; separate with ample space
- Background is a neutral studio backdrop, not competing

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| sm | 8px | Small elements |
| md | 12px | Buttons, tags |
| lg | 16px | Inputs, small cards |
| xl | 20px | Cards, panels |
| 2xl | 24px | Large containers |
| full | 9999px | Pills, badges |

---

## 6. Depth & Elevation

### Elevation Table

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat, inset | Background surfaces, pressed elements |
| 1 | 0 2px 0 shadow | Subtle raised elements |
| 2 | 0 4px 0 shadow | Buttons, small interactive |
| 3 | 0 6px 0 shadow | Cards, primary interactive |
| 4 | 0 8px 0 shadow | Elevated cards |
| 5 | 0 12px 0 shadow | Modals, popovers, top layers |

### Shadow Philosophy
Shadows in this system are **solid, directional shadows** that mimic the shadow cast by a clay object sitting on a surface. They are not blurred — instead they use a solid offset shadow in a darker shade of the element's color. This creates the authentic "clay pressed onto surface" effect. The shadow color is always a darker, desaturated version of the element's base color.

---

## 7. Do's and Don'ts

### Do
- Apply clay/plasticine texture to all colored surfaces
- Include visible fingerprint marks and imperfections
- Use very rounded, sculpted forms — border-radius 16px+
- Apply solid offset shadows for clay depth
- Use top-edge highlights for 3D form
- Maintain saturated but slightly muted clay colors
- Add shiny highlights on raised surfaces
- Stage layouts like miniature sets
- Use chunky, rounded typography
- Create "indented" appearance for inputs

### Don't
- Use sharp corners or thin borders
- Apply blurred, soft shadows — always solid offset
- Use photorealistic images or clean vectors
- Create perfect geometric precision
- Use thin font weights or sharp serifs
- Add gradients or glossy digital effects
- Use neon or overly bright colors
- Make elements look "flat" — always add depth

---

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 640px | Single column, stacked layout |
| Tablet | 640px - 1024px | 2-column grid |
| Desktop | 1024px - 1440px | Full 12-column grid |
| Wide | > 1440px | Centered content |

### Touch Targets
- Minimum: 48px x 48px for all interactive elements
- Buttons: Full-width on mobile
- Input height: 52px minimum on mobile

### Collapsing Strategy
- Sidebar becomes bottom sheet on mobile
- Navigation collapses to hamburger below 768px
- Cards stack vertically
- Shadow offsets reduce slightly on mobile

### Image Behavior
- Clay images scale proportionally
- Maintain rounded corners at all sizes
- Texture overlay remains consistent
- Shadows simplify on smaller screens

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#E8E2DC` (Studio Backdrop)
- Primary: `#D4574A` (Clay Red)
- Secondary: `#5B8DB8` (Clay Blue)
- Highlight: `#E8C547` (Clay Yellow)
- Text: `#3D3530` (Dark Clay)
- Shadow: `rgba(61, 53, 48, 0.2)`

### Example Component Prompts

1. **Clay Button:** "Create a primary button with Clay Red (#D4574A) background with clay texture overlay, white text, 24px border-radius (very rounded, pill-like but slightly organic), 14px 28px padding. Add a solid 0 6px 0 shadow in darker red (#A63C32) for clay depth. Top edge has lighter highlight (#E07A6F) for 3D form. On hover, translateY(-2px) and shadow grows. On active, translateY(4px) and shadow compresses."

2. **Clay Card:** "Design a card with Clay White (#F5F0EB) background with subtle clay texture, 20px border-radius, 28px padding. Add 0 8px 0 shadow in Shadow Brown. Top-left edge has slight highlight for 3D sculpted appearance. No borders — clay forms don't have borders."

3. **Clay Input:** "Create a text input with Clay White background, 3px solid Light Clay border, 16px border-radius, 14px 18px padding. Appears slightly indented into the surface. Focus state uses Clay Blue border with subtle glow. Placeholder in Studio Gray."

4. **Clay Badge:** "Design a pill badge with Clay Yellow (#E8C547) background, fully rounded (999px), 6px 14px padding. Add 0 3px 0 shadow in darker yellow. Text in Dark Clay. Small and chunky like a clay bead."

5. **Clay Navigation:** "Create a top navigation bar with Studio Backdrop background, 4px solid Light Clay bottom border. Links in Dark Clay, hover in Clay Red. Active link has Clay Red color with thick clay underline. Height 64px."

6. **Sculpted Panel:** "Design a major content panel with Studio Backdrop background, 24px border-radius, 0 12px 0 shadow. Appears pressed into the surface with subtle highlight on top edge. Used for hero sections or major content blocks."

7. **Clay Checkbox:** "Create a custom checkbox with rounded square shape (6px radius), 3px Light Clay border when unchecked. Checkmark is a sculpted tick in Clay Green. Add 0 2px 0 shadow for depth."

### Iteration Guide

1. **Start with the studio backdrop:** Establish the neutral studio background (#E8E2DC) first.
2. **Apply clay texture:** Add subtle clay/plasticine texture overlay to all colored surfaces before adding content.
3. **Add solid offset shadows:** Use 0 Y-offset solid shadows (not blurred) for authentic clay depth.
4. **Add top highlights:** Apply lighter color on top edges for 3D sculpted form.
5. **Round everything:** Ensure all corners are significantly rounded (16px+), no sharp edges.
6. **Verify texture consistency:** Check that all surfaces have consistent clay texture and fingerprint detail.
7. **Test depth perception:** Ensure shadows and highlights create clear 3D form — elements should look touchable.
