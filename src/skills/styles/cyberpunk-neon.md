# Cyberpunk Neon

A neon-drenched, futuristic aesthetic built on deep darkness pierced by electric light. This design system channels the energy of a rain-soaked metropolis at midnight — glowing signs, digital decay, and the beautiful tension between humanity and technology.

---

## 1. Visual Theme

- **Philosophy**: High-tech, low-life. Beauty in decay. The future is bright, loud, and slightly broken.
- **Mood**: Edgy, mysterious, energetic, dystopian, nocturnal.
- **Aesthetic**: A Blade Runner cityscape compressed into UI form. Neon signs flicker, rain streaks down glass, holograms glitch into existence.
- **Key Characteristics**:
  - Glowing neon outlines that pulse with energy
  - Deep, atmospheric dark backgrounds
  - Digital glitch effects and data corruption artifacts
  - Circuit board patterns and tech-grunge overlays
  - Holographic, translucent elements
  - Rain, reflections, and wet surface effects
  - Chrome and metallic accents catching neon light

---

## 2. Color Palette

| Role | Color Name | Hex | Usage |
|------|-----------|-----|-------|
| Background | Deep Void | #0A0A0A | Primary background, the darkness between lights |
| Background | Dark Purple | #1A0A2E | Gradient endpoints, atmospheric depth |
| Primary | Neon Pink | #FF00FF | Primary accent, energetic highlights, active states |
| Primary | Electric Cyan | #00FFFF | Secondary accent, links, info, cool energy |
| Primary | Electric Blue | #0080FF | Tertiary accent, deep glow, stable elements |
| Accent | Hot Magenta | #FF1493 | Warnings, alerts, intense emphasis |
| Accent | Acid Green | #39FF14 | Success, system OK, toxic energy |
| Accent | Chrome Silver | #C0C0C0 | Metallic elements, reflections, tech frames |
| Glow | Pink Halo | rgba(255,0,255,0.3) | Neon glow effects, ambient light |
| Glow | Cyan Halo | rgba(0,255,255,0.3) | Secondary glow, holographic tint |
| Text | Neon White | #E0E0E0 | Primary text, sharp and bright |
| Text | Dim Gray | #6B6B6B | Secondary text, disabled states, background data |

**Color Usage Rules**:
- Background must remain overwhelmingly dark — 90%+ of the canvas
- Neon colors should be used as light sources, not fills
- All accent elements should have a glow effect (box-shadow or text-shadow)
- Combine pink and cyan for maximum cyberpunk impact
- Use chrome/silver sparingly for frames and tech borders

---

## 3. Typography

| Role | Font Style | Weight | Size | Usage |
|------|-----------|--------|------|-------|
| Display | Tech/Digital font (monospace or futuristic sans) | Bold | 48-72px | Hero titles, brand names, major headings |
| Heading | Geometric sans or stencil | SemiBold | 28-40px | Section headers, system labels |
| Body | Clean sans-serif | Regular | 14-18px | Descriptions, readable content |
| Mono | Monospace tech font | Regular | 12-14px | Code, data readouts, system logs |
| Accent | Glitched or outlined display | Bold | 24-32px | Special emphasis, warning text |

**Typography Rules**:
- Display text should have a neon glow effect (text-shadow with accent color)
- Use all-caps for tech labels, system messages, and navigation
- Monospace for any data, numbers, or "system" content
- Slight letter-spacing (0.05-0.1em) on headings for tech feel
- Flicker animation optional on key display text

---

## 4. Components

### Buttons
- Shape: Sharp rectangles or angled polygons (slanted edges)
- Fill: Transparent with neon border, or solid neon with dark text
- Border: 1-2px solid neon color with outer glow
- Hover: Intensified glow, slight scale-up, color shift
- Active: Inverted — neon background, dark text
- Shadow: Multi-layered box-shadow creating neon halo effect

### Cards
- Background: Semi-transparent dark (rgba(10,10,10,0.8)) with blur
- Border: 1px neon line, possibly with corner accents
- Corner: Sharp 0-4px, or cut-off corners for tech feel
- Shadow: Neon glow emanating from edges
- Overlay: Subtle scan lines or grid pattern

### Icons
- Style: Geometric, angular, circuit-inspired
- Stroke: Neon color, 1.5-2px
- Fill: None or very subtle neon tint
- Effects: Glow, occasional glitch offset
- Examples: Power symbols, circuit nodes, wifi arcs, skulls, arrows

### Inputs
- Background: Near-black with subtle inner glow
- Border: 1px dim gray, neon on focus
- Focus: Bright neon border with pulsating glow
- Placeholder: Dim gray, monospace style
- Cursor: Block cursor, neon color

---

## 5. Layout

- **Approach**: Asymmetrical, layered, dense. Information overload as aesthetic.
- **Spacing**: Tight packing with high contrast between elements.
- **Composition**: Overlapping layers, floating panels, holographic depth.
- **Grid**: Visible tech grid as background element, 45-degree angles optional.
- **Depth**: Multiple z-layers with parallax potential — background city, midground UI, foreground alerts.

---

## 6. Depth

- **Method**: Neon glow creates atmospheric depth; layers create spatial depth
- **Shadows**: Colored glows replace traditional shadows — pink glow below pink elements
- **Highlight**: Bright neon edges, chrome reflections
- **Layering**: Glass-morphism panels over dark backgrounds over grid patterns
- **Effects**: Scan lines, vignette, rain streaks, lens flares on bright elements
- **Holograms**: Semi-transparent, slightly distorted, with chromatic aberration

---

## 7. Do / Don'ts

### Do
- Use glowing neon outlines on all important elements
- Keep backgrounds deep black or very dark purple
- Add digital glitch effects on transitions and hover states
- Include circuit patterns, grid lines, and tech-grunge textures
- Use holographic translucent panels for content containers
- Apply rain, reflection, and wet surface effects where appropriate
- Combine pink and cyan for classic cyberpunk contrast
- Use monospace fonts for data and system information

### Don't
- Use light or white backgrounds — destroys the neon effect
- Apply soft, organic shapes — keep everything angular and geometric
- Use pastel or muted colors — cyberpunk demands saturation
- Add realistic wood, paper, or natural textures
- Use rounded corners excessively — sharp and edgy is the rule
- Make everything glow equally — establish a hierarchy of light

---

## 8. Responsive

- **Mobile**: Stack panels vertically, maintain neon accents, simplify background effects
- **Tablet**: Two-column grid with neon dividers, preserve atmospheric depth
- **Desktop**: Full multi-panel dashboard layout with overlapping holographic layers
- **Touch**: Tap targets should have neon ripple effects on interaction
- **Performance**: Glow effects and animations should degrade gracefully on lower-end devices

---

## 9. Agent Prompt Guide

When generating UI with this style, instruct the AI to:

1. Set the background to deep black (#0A0A0A) or dark purple (#1A0A2E)
2. Use neon pink (#FF00FF) and electric cyan (#00FFFF) as primary accent colors
3. Apply glowing neon outlines to all interactive elements and headings
4. Add digital glitch effects to transitions, hover states, and decorative elements
5. Include circuit board patterns and tech grid lines as background texture
6. Create holographic translucent panels with blur and chromatic aberration
7. Use angular, geometric shapes with sharp corners
8. Apply rain, reflection, and wet surface effects to appropriate elements
9. Use monospace fonts for data and all-caps tech labels for navigation
10. Add scan lines, vignette, and atmospheric fog for depth

**Keywords to include**: cyberpunk, neon, futuristic, dystopian, glowing, glitch, holographic, circuit, rain, reflections, dark, electric, tech-grunge, nocturnal

**Avoid**: light backgrounds, organic shapes, pastel colors, natural textures, soft shadows, rounded corners, minimal white space, friendly/approachable aesthetics
