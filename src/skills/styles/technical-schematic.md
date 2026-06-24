# Technical Schematic Design System

A precise, engineering-focused design language inspired by technical drawings and blueprints. Clean geometry, grid patterns, and measurement annotations create an atmosphere of technical precision and clarity.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:** Precise, technical, analytical, systematic, professional. Like an engineering blueprint or architectural drawing.

**Emotional Description:** The design evokes the clarity and precision of a well-executed technical drawing — every line has purpose, every measurement is exact, every element is systematically placed. It feels authoritative, logical, and meticulously crafted.

**Key Characteristics:**
- Geometric precision throughout
- Grid pattern or isometric angle
- Dimension lines and measurements
- Technical symbols and annotations
- Clean vector shapes
- Consistent stroke weights
- Blueprint white-on-blue or dark-on-light variants
- All-caps labels and annotations

---

## 2. Color Palette & Roles

### Primary (Blueprint Variant)
| Name | Hex | Usage |
|------|-----|-------|
| Blueprint Blue | `#1E3A5F` | Primary background |
| Blueprint White | `#FFFFFF` | Lines, text, geometry |
| Blueprint Cyan | `#4ECDC4` | Highlights, annotations |

### Primary (Light Variant)
| Name | Hex | Usage |
|------|-----|-------|
| Tech Blue | `#2563EB` | Primary accent |
| Tech Teal | `#0D9488` | Secondary accent |
| Dark Gray | `#1F2937` | Text, lines |

### Secondary
| Name | Hex | Usage |
|------|-----|-------|
| Amber | `#F59E0B` | Warnings, callouts |
| Cyan | `#06B6D4` | Informational, data |
| Gray | `#6B7280` | Secondary text |

### Interactive
| Name | Hex | Usage |
|------|-----|-------|
| Button Primary | `#2563EB` | Primary actions |
| Button Hover | `#1D4ED8` | Hover state |
| Link | `#0D9488` | Text links |
| Focus Ring | `#F59E0B` | Focus indicators |

### Neutral
| Name | Hex | Usage |
|------|-----|-------|
| Dark | `#111827` | Primary text |
| Medium | `#4B5563` | Secondary text |
| Light | `#9CA3AF` | Captions, metadata |

### Surface
| Name | Hex | Usage |
|------|-----|-------|
| White | `#FFFFFF` | Primary background (light) |
| Light Gray | `#F3F4F6` | Secondary background |
| Blueprint | `#1E3A5F` | Primary background (blueprint) |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#10B981` | Positive feedback |
| Warning | `#F59E0B` | Alerts |
| Error | `#EF4444` | Errors |
| Info | `#06B6D4` | Informational |

---

## 3. Typography Rules

**Font Family:**
- **Headings:** "Roboto Mono" or "JetBrains Mono" — technical monospace
- **Body:** "Inter" or "Roboto" — clean, technical sans-serif
- **Labels:** "Roboto Mono" — all-caps, technical

### Hierarchy Table

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Roboto Mono | 40px | 700 | 1.2 | 0.04em | Hero titles |
| H1 | Roboto Mono | 32px | 700 | 1.25 | 0.03em | Section titles |
| H2 | Roboto Mono | 24px | 700 | 1.3 | 0.02em | Subsection headers |
| H3 | Inter | 20px | 600 | 1.35 | 0.01em | Card titles |
| Body | Inter | 16px | 400 | 1.6 | 0 | Paragraph text |
| Body Small | Inter | 14px | 400 | 1.5 | 0 | Captions |
| Label | Roboto Mono | 11px | 500 | 1.4 | 0.08em | Tags, labels, all-caps |
| Button | Roboto Mono | 14px | 500 | 1 | 0.04em | Button text, all-caps |
| Annotation | Roboto Mono | 12px | 400 | 1.4 | 0.02em | Technical notes |

### Principles
- Monospace for headings and labels
- All-caps for labels, annotations, buttons
- Consistent, measured spacing
- Technical, systematic feel
- Clear hierarchy through weight and size

---

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#2563EB`
- Text: `#FFFFFF`
- Border: none
- Border-radius: 2px
- Padding: 10px 20px
- Font: Roboto Mono, all-caps
- Hover: Background `#1D4ED8`
- Active: Background `#1E40AF`

**Secondary Button**
- Background: transparent
- Border: 1px solid `#2563EB`
- Text: `#2563EB`
- Hover: Background `rgba(37, 99, 235, 0.1)`

**Icon Button**
- Square, 40px
- Border: 1px solid `#D1D5DB`
- Icon inside

### Cards & Containers

**Schematic Card**
- Background: `#FFFFFF`
- Border: 1px solid `#D1D5DB`
- Border-radius: 2px
- Padding: 24px
- Optional: Corner brackets decoration

**Blueprint Panel**
- Background: `#1E3A5F`
- Border: 1px solid `rgba(255, 255, 255, 0.2)`
- Padding: 24px
- White text and lines

**Data Panel**
- Background: `#F3F4F6`
- Border-left: 3px solid `#2563EB`
- Padding: 16px 20px
- Monospace data display

### Inputs & Forms

**Text Input**
- Background: `#FFFFFF`
- Border: 1px solid `#D1D5DB`
- Border-radius: 2px
- Padding: 10px 14px
- Focus: Border `#2563EB`, 2px solid
- Placeholder: `#9CA3AF`

**Textarea**
- Same as text input
- Min-height: 120px

**Checkbox**
- Custom square with thin border
- Checkmark: precise tick
- Unchecked: empty with border

### Navigation

**Top Nav**
- Background: `#FFFFFF`
- Border-bottom: 1px solid `#D1D5DB`
- Links: `#1F2937`, hover `#2563EB`
- Active: `#2563EB`
- Height: 56px

**Sidebar Nav**
- Background: `#F3F4F6`
- Items: Padding 10px 14px
- Active: Background `#FFFFFF`, left border `#2563EB`
- Hover: Background `#FFFFFF`

### Image Treatment
- Technical diagram style
- Clean vector lines
- Measurement annotations
- Grid overlay optional

### Distinctive Components

**Dimension Line**
- Thin line with arrow endpoints
- Measurement text in monospace
- Used for annotations

**Grid Overlay**
- Light grid pattern
- Used as background decoration
- Low opacity

**Corner Brackets**
- L-shaped brackets at corners
- Used to frame content
- Technical aesthetic

**Callout Bubble**
- Circle or box with leader line
- Annotation text inside
- Used for technical notes

**Isometric Block**
- 30-degree angle block
- Clean fills
- Used for 3D representation

---

## 5. Layout Principles

### Spacing System
| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps |
| sm | 8px | Inline spacing |
| md | 16px | Standard padding |
| lg | 24px | Card padding |
| xl | 32px | Section gaps |
| 2xl | 48px | Major separations |

### Grid & Container
- Max container width: 1200px
- Grid: 12-column with 24px gutters
- Content padding: 24px (mobile), 48px (desktop)
- Precise, systematic layouts

### Whitespace Philosophy
- Clean, structured layouts
- Elements align to grid
- Generous padding for clarity
- Systematic spacing

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| none | 0 | Sharp corners |
| sm | 2px | Minimal rounding |
| md | 4px | Standard elements |

---

## 6. Depth & Elevation

### Elevation Table

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat | Backgrounds |
| 1 | Subtle shadow | Subtle depth |
| 2 | Light shadow | Cards, panels |
| 3 | Medium shadow | Elevated elements |

### Shadow Philosophy
Shadows are minimal and precise, using low-opacity black with small blur. They create subtle depth without interfering with the technical clarity. The focus is on clean lines and geometric precision, not atmospheric depth.

---

## 7. Do's and Don'ts

### Do
- Maintain geometric precision
- Use consistent stroke weights
- Apply grid patterns as decoration
- Include measurement annotations
- Use monospace fonts for technical elements
- Create all-caps labels
- Use clean vector shapes
- Maintain systematic spacing

### Don't
- Use organic or flowing shapes
- Apply gradients or glow effects
- Use decorative or script fonts
- Create irregular spacing
- Add realistic textures
- Use rounded corners excessively
- Add playful or cute elements

---

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 640px | Single column |
| Tablet | 640px - 1024px | 2-column |
| Desktop | 1024px - 1440px | Full grid |
| Wide | > 1440px | Centered |

### Touch Targets
- Minimum: 44px x 44px
- Buttons: Full-width on mobile
- Input height: 48px minimum

### Collapsing Strategy
- Sidebar to sheet on mobile
- Hamburger nav below 768px
- Cards stack vertically
- Grid patterns simplify

### Image Behavior
- Scale proportionally
- Maintain technical style
- Annotations remain readable

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background (light): `#FFFFFF`
- Background (blueprint): `#1E3A5F`
- Primary: `#2563EB` (Tech Blue)
- Secondary: `#0D9488` (Tech Teal)
- Accent: `#F59E0B` (Amber)
- Text: `#1F2937` (Dark)

### Example Component Prompts

1. **Schematic Button:** "Create a primary button with Tech Blue background, white text, no border, 2px border-radius, 10px 20px padding. Font: Roboto Mono, all-caps. On hover, background darkens to #1D4ED8."

2. **Schematic Card:** "Design a card with white background, 1px solid Light Gray border, 2px border-radius, 24px padding. Optional corner bracket decorations for technical aesthetic."

3. **Blueprint Panel:** "Create a panel with Blueprint Blue background, 1px solid rgba(255,255,255,0.2) border, 24px padding. White text and lines. Used for technical diagrams."

4. **Text Input:** "Design a text input with white background, 1px solid Light Gray border, 2px border-radius, 10px 14px padding. Focus state has 2px solid Tech Blue border."

5. **Dimension Line:** "Add a dimension line with thin stroke, arrow endpoints, and measurement text in monospace font. Used for technical annotations."

6. **Data Panel:** "Create a data display panel with Light Gray background, 3px solid Tech Blue left border, 16px 20px padding. Monospace font for data values."

7. **Navigation:** "Design a top nav with white background, 1px solid Light Gray bottom border. Links in Dark, hover in Tech Blue. Active has Tech Blue. Height 56px."

### Iteration Guide

1. **Start with grid foundation:** Establish grid pattern or alignment system.
2. **Apply precise geometry:** Clean lines, consistent strokes, exact angles.
3. **Use technical fonts:** Monospace for headings and labels.
4. **Add annotations:** Dimension lines, callouts, measurement text.
5. **Maintain consistency:** Same stroke weights, spacing, and alignment.
6. **Include technical symbols:** Arrows, brackets, geometric markers.
7. **Verify precision:** Everything should feel measured and exact.
