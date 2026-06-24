# Aged Academia Design System

A scholarly, historical design language inspired by vintage scientific illustrations and aged manuscripts. Sepia tones, parchment textures, and precise line work create an atmosphere of timeless knowledge and academic rigor.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:** Scholarly, historical, precise, contemplative, authentic. Like a page from Darwin's notebook or a Victorian specimen catalog.

**Emotional Description:** The design evokes the hushed atmosphere of a rare books library — the smell of old paper, the precision of scientific illustration, the weight of accumulated knowledge. It feels timeless, authoritative, and deeply human.

**Key Characteristics:**
- Aged paper texture overlay on all surfaces
- Detailed cross-hatching and line work
- Scientific illustration precision
- Study notes and margin annotations
- Specimen plate or sketch aesthetic
- Numbered diagram elements
- Sepia and earth-tone dominance
- Faded ink spots and aging effects

---

## 2. Color Palette & Roles

### Primary
| Name | Hex | Usage |
|------|-----|-------|
| Sepia | `#704214` | Primary text, headings, ink |
| Aged Ink | `#5C4033` | Secondary text, annotations |
| Parchment | `#F4E4BC` | Primary background |

### Secondary
| Name | Hex | Usage |
|------|-----|-------|
| Faded Red | `#B85450` | Annotations, corrections |
| Iron Gall | `#4A3728` | Dark ink, emphasis |
| Sienna | `#A0522D` | Warm accents |

### Interactive
| Name | Hex | Usage |
|------|-----|-------|
| Button Primary | `#704214` | Primary actions |
| Button Hover | `#8B5A2B` | Hover state |
| Link | `#5C4033` | Text links |
| Focus Ring | `#B85450` | Focus indicators |

### Neutral
| Name | Hex | Usage |
|------|-----|-------|
| Dark Brown | `#3D2B1F` | Headings, strong text |
| Medium Brown | `#8B7355` | Secondary text |
| Light Brown | `#C4B8A0` | Dividers, borders |

### Surface
| Name | Hex | Usage |
|------|-----|-------|
| Parchment | `#F4E4BC` | Primary background |
| Aged Paper | `#E8D4B0` | Secondary background |
| Dark Paper | `#D4C4A0` | Elevated surfaces |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#6B8E6B` | Positive (muted green) |
| Warning | `#C4A35A` | Alerts (aged gold) |
| Error | `#B85450` | Errors (faded red) |
| Info | `#5C7A8A` | Informational (muted blue) |

---

## 3. Typography Rules

**Font Family:**
- **Headings:** "Cinzel" or "Playfair Display" — classical serif
- **Body:** "Crimson Text" or "Libre Baskerville" — readable, scholarly
- **Accent:** "Caveat" or "Homemade Apple" — handwritten notes
- **Labels:** "IM Fell English" — historical, printed

### Hierarchy Table

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Cinzel | 42px | 700 | 1.2 | 0.04em | Hero titles |
| H1 | Cinzel | 32px | 700 | 1.25 | 0.03em | Section titles |
| H2 | Cinzel | 26px | 700 | 1.3 | 0.02em | Subsection headers |
| H3 | Crimson Text | 20px | 700 | 1.35 | 0.01em | Card titles |
| Body | Crimson Text | 16px | 400 | 1.7 | 0.01em | Paragraph text |
| Body Small | Crimson Text | 14px | 400 | 1.6 | 0.01em | Captions |
| Label | IM Fell English | 12px | 400 | 1.4 | 0.04em | Tags, labels |
| Button | Cinzel | 14px | 700 | 1 | 0.06em | Button text |
| Note | Caveat | 16px | 400 | 1.5 | 0 | Margin notes |

### Principles
- Serif fonts exclusively for scholarly feel
- Small caps for labels and scientific names
- Italics for emphasis and Latin terms
- Handwritten style for notes and annotations
- Generous line height for readability

---

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#704214`
- Text: `#F4E4BC`
- Border: 1px solid `#5C4033`
- Border-radius: 2px
- Padding: 10px 20px
- Font: Cinzel, small caps
- Hover: Background `#8B5A2B`
- Active: Background `#5C4033`

**Secondary Button**
- Background: transparent
- Border: 1px solid `#704214`
- Text: `#704214`
- Hover: Background `rgba(112, 66, 20, 0.1)`

**Icon Button**
- Square, 40px
- Border: 1px solid `#C4B8A0`
- Sepia icon inside

### Cards & Containers

**Specimen Card**
- Background: `#F4E4BC` with paper texture
- Border: 1px solid `#C4B8A0`
- Border-radius: 2px
- Padding: 24px
- Optional: Numbered label in corner

**Notebook Page**
- Background: `#F4E4BC`
- Border: 1px solid `#C4B8A0`
- Margin line on left
- Used for content sections

**Annotation Box**
- Background: `rgba(184, 84, 80, 0.1)`
- Border-left: 2px solid `#B85450`
- Padding: 12px 16px
- Font: Caveat (handwritten)

### Inputs & Forms

**Text Input**
- Background: `#F4E4BC`
- Border: 1px solid `#C4B8A0`
- Border-radius: 2px
- Padding: 10px 14px
- Text: `#5C4033`
- Focus: Border `#704214`
- Placeholder: `#8B7355`

**Textarea**
- Same as text input
- Min-height: 120px

**Checkbox**
- Custom square with thin border
- Checkmark: precise tick in `#704214`
- Unchecked: empty with border

### Navigation

**Top Nav**
- Background: `#F4E4BC` with texture
- Border-bottom: 1px solid `#C4B8A0`
- Links: `#5C4033`, hover `#704214`
- Active: `#704214` with underline
- Height: 56px

**Sidebar Nav**
- Background: `#E8D4B0`
- Items: Padding 10px 14px
- Active: Background `#F4E4BC`, left border `#704214`
- Hover: Background `#F4E4BC`

### Image Treatment
- Images have aged, sepia treatment
- Parchment texture overlay
- Optional: Hand-drawn frame
- Scientific illustration style

### Distinctive Components

**Specimen Label**
- Small label with number
- Font: IM Fell English
- Border: 1px solid `#C4B8A0`
- Used for diagrams, images

**Margin Note**
- Handwritten text in margin
- Font: Caveat
- Color: `#B85450` (faded red)
- Connected by thin line

**Cross-Hatch Decoration**
- Detailed line work pattern
- Used for shading, depth
- Color: `#C4B8A0`

**Ink Spot**
- Subtle ink blot decoration
- Low opacity
- Creates authentic aged feel

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
- Max container width: 1100px
- Grid: 12-column with 24px gutters
- Content padding: 24px (mobile), 48px (desktop)
- Classical, balanced layouts

### Whitespace Philosophy
- Generous margins like a book page
- Content well-contained
- Breathing room for scholarly feel
- Margins for notes and annotations

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| none | 0 | Sharp corners |
| sm | 2px | Subtle rounding |
| md | 4px | Standard elements |

---

## 6. Depth & Elevation

### Elevation Table

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat | Backgrounds |
| 1 | Subtle shadow | Subtle depth |
| 2 | Soft shadow | Cards, panels |
| 3 | Deeper shadow | Elevated elements |

### Shadow Philosophy
Shadows are minimal and subtle, using warm brown tones at low opacity. They create gentle depth without modern crispness — like pages slightly lifted in an old book. The shadow color is always a warm brown, never cool gray.

---

## 7. Do's and Don'ts

### Do
- Apply aged paper texture to all surfaces
- Use serif fonts exclusively
- Include scientific illustration details
- Add margin annotations and notes
- Use sepia and earth-tone colors
- Create cross-hatching and line work
- Add ink spots and aging effects
- Use small caps for labels

### Don't
- Use sans-serif fonts
- Apply bright or neon colors
- Create modern glass or glow effects
- Use rounded corners excessively
- Add digital or tech motifs
- Use thin, delicate strokes for borders
- Create perfect symmetry — embrace organic imperfection

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
- Margins reduce on mobile

### Image Behavior
- Scale proportionally
- Maintain sepia treatment
- Texture consistent

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#F4E4BC` (Parchment)
- Primary: `#704214` (Sepia)
- Secondary: `#5C4033` (Aged Ink)
- Accent: `#B85450` (Faded Red)
- Text: `#3D2B1F` (Dark Brown)

### Example Component Prompts

1. **Academic Button:** "Create a primary button with Sepia (#704214) background, Parchment text, 1px solid Aged Ink border, 2px border-radius, 10px 20px padding. Font: Cinzel in small caps. On hover, background lightens to #8B5A2B."

2. **Specimen Card:** "Design a card with Parchment background with paper texture, 1px solid Light Brown border, 2px border-radius, 24px padding. Optional numbered specimen label in corner."

3. **Notebook Page:** "Create a content section with Parchment background, 1px solid border, left margin line. Used for main content areas."

4. **Text Input:** "Design a text input with Parchment background, 1px solid Light Brown border, 2px border-radius, 10px 14px padding. Sepia text. Focus state has Sepia border."

5. **Annotation Box:** "Create an annotation box with rgba(184,84,80,0.1) background, 2px solid Faded Red left border, 12px 16px padding. Font: Caveat (handwritten style)."

6. **Margin Note:** "Add a handwritten margin note in Caveat font, Faded Red color, connected to content by thin line."

7. **Navigation:** "Design a top nav with Parchment background with texture, 1px solid Light Brown bottom border. Links in Aged Ink, hover in Sepia. Active has Sepia with underline. Height 56px."

### Iteration Guide

1. **Start with parchment texture:** Establish aged paper background first.
2. **Apply sepia tones:** Use brown/earth color palette throughout.
3. **Use serif fonts:** All text in classical serif typefaces.
4. **Add scientific details:** Cross-hatching, specimen labels, diagrams.
5. **Include annotations:** Handwritten notes, margin comments.
6. **Add aging effects:** Ink spots, fading, texture variations.
7. **Verify scholarly feel:** Everything should feel like a historical document.
