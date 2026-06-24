# Corporate Memphis Design System

A vibrant, playful design language inspired by the Corporate Memphis illustration style. Flat vector people, bright geometric fills, and abstract shapes create a modern, approachable business aesthetic.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:** Modern, approachable, vibrant, professional-but-friendly, inclusive. Like a contemporary tech company blog or SaaS landing page.

**Emotional Description:** The design evokes the friendly professionalism of modern tech — diverse, colorful, and approachable. It feels contemporary, optimistic, and inclusive without being childish.

**Key Characteristics:**
- Flat vector illustration style
- Disproportionate human figures with abstract shapes
- Bright, saturated geometric fills
- Floating geometric elements (circles, blobs, waves)
- No outlines, solid color fills
- Plant and object accents
- Clean, minimal decoration
- Gradient fills on shapes

---

## 2. Color Palette & Roles

### Primary
| Name | Hex | Usage |
|------|-----|-------|
| Memphis Purple | `#7B68EE` | Primary accent, creative |
| Memphis Orange | `#FF8C42` | Secondary accent, energy |
| Memphis Teal | `#00C9B7` | Tertiary accent, growth |

### Secondary
| Name | Hex | Usage |
|------|-----|-------|
| Memphis Yellow | `#FFD93D` | Highlights, optimism |
| Memphis Pink | `#FF6B9D` | Warm accent, friendly |
| Memphis Blue | `#4A90E2` | Trust, tech |

### Interactive
| Name | Hex | Usage |
|------|-----|-------|
| Button Primary | `#7B68EE` | Primary actions |
| Button Hover | `#6A5ACD` | Hover state |
| Link | `#4A90E2` | Text links |
| Focus Ring | `#FFD93D` | Focus indicators |

### Neutral
| Name | Hex | Usage |
|------|-----|-------|
| Dark Gray | `#2D3748` | Primary text |
| Medium Gray | `#718096` | Secondary text |
| Light Gray | `#E2E8F0` | Dividers, borders |

### Surface
| Name | Hex | Usage |
|------|-----|-------|
| White | `#FFFFFF` | Primary background |
| Off-White | `#F7FAFC` | Secondary background |
| Light Surface | `#EDF2F7` | Elevated surfaces |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#00C9B7` | Positive feedback |
| Warning | `#FFD93D` | Alerts |
| Error | `#FF6B6B` | Errors |
| Info | `#4A90E2` | Informational |

---

## 3. Typography Rules

**Font Family:**
- **Headings:** "Poppins" or "Montserrat" — clean, modern sans-serif
- **Body:** "Open Sans" or "Inter" — highly readable
- **Accent:** "Nunito" — rounded, friendly

### Hierarchy Table

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Poppins | 48px | 700 | 1.1 | -0.02em | Hero titles |
| H1 | Poppins | 36px | 700 | 1.2 | -0.01em | Section titles |
| H2 | Poppins | 28px | 700 | 1.25 | -0.01em | Subsection headers |
| H3 | Poppins | 22px | 600 | 1.3 | 0 | Card titles |
| Body | Open Sans | 16px | 400 | 1.6 | 0 | Paragraph text |
| Body Small | Open Sans | 14px | 400 | 1.5 | 0 | Captions |
| Label | Poppins | 12px | 600 | 1.4 | 0.04em | Tags, labels |
| Button | Poppins | 16px | 600 | 1 | 0.02em | Button text |

### Principles
- Clean, modern sans-serif throughout
- Bold headings for hierarchy
- Generous line height for readability
- Minimal decoration — let shapes and color speak

---

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#7B68EE`
- Text: `#FFFFFF`
- Border: none
- Border-radius: 8px
- Padding: 12px 24px
- Hover: Background `#6A5ACD`, translateY(-2px)
- Active: translateY(0)

**Secondary Button**
- Background: `#FF8C42`
- Same treatment as primary
- Text: `#FFFFFF`

**Ghost Button**
- Background: transparent
- Border: 2px solid `#7B68EE`
- Text: `#7B68EE`
- Hover: Background `rgba(123, 104, 238, 0.1)`

### Cards & Containers

**Memphis Card**
- Background: `#FFFFFF`
- Border: none
- Border-radius: 16px
- Shadow: 0 4px 16px `rgba(0, 0, 0, 0.08)`
- Padding: 24px
- Optional: Geometric shape decoration

**Feature Card**
- Background: `#FFFFFF`
- Border-radius: 16px
- Shadow: 0 8px 24px `rgba(0, 0, 0, 0.1)`
- Padding: 32px
- Icon/illustration at top

**Stat Card**
- Background: gradient from `#7B68EE` to `#4A90E2`
- Border-radius: 16px
- Padding: 24px
- White text

### Inputs & Forms

**Text Input**
- Background: `#FFFFFF`
- Border: 2px solid `#E2E8F0`
- Border-radius: 8px
- Padding: 12px 16px
- Focus: Border `#7B68EE`
- Placeholder: `#718096`

**Textarea**
- Same as text input
- Min-height: 120px

**Checkbox**
- Custom rounded square
- Checkmark: `#7B68EE`
- Unchecked: border `#E2E8F0`

### Navigation

**Top Nav**
- Background: `#FFFFFF`
- Border-bottom: 1px solid `#E2E8F0`
- Links: `#2D3748`, hover `#7B68EE`
- Active: `#7B68EE`
- Height: 64px

**Sidebar Nav**
- Background: `#F7FAFC`
- Items: Padding 12px 16px
- Active: Background `#FFFFFF`, left border `#7B68EE`
- Hover: Background `#FFFFFF`

### Image Treatment
- Flat vector illustrations
- Bright, saturated colors
- Abstract, disproportionate figures
- Geometric shapes as decoration
- No outlines, solid fills

### Distinctive Components

**Geometric Blob**
- Organic, amorphous shape
- Gradient fill (primary colors)
- Used as background decoration
- Low opacity (10-20%)

**Floating Shape**
- Circle, triangle, or wave
- Solid bright color
- Floating near content
- Decorative accent

**Abstract Figure**
- Flat vector person
- Disproportionate limbs
- Bright solid color skin/clothes
- Used for empty states, illustrations

**Wave Divider**
- Wavy line or shape
- Gradient fill
- Used between sections

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
| 3xl | 64px | Page-level spacing |

### Grid & Container
- Max container width: 1280px
- Grid: 12-column with 24px gutters
- Content padding: 24px (mobile), 48px (desktop)
- Modern, clean layouts

### Whitespace Philosophy
- Clean, airy layouts
- Generous spacing between sections
- White space lets colors pop
- Structured but not rigid

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| sm | 8px | Small elements |
| md | 12px | Inputs, tags |
| lg | 16px | Cards |
| xl | 24px | Large containers |
| full | 9999px | Pills |

---

## 6. Depth & Elevation

### Elevation Table

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat | Backgrounds |
| 1 | 0 2px 8px rgba(0,0,0,0.06) | Subtle depth |
| 2 | 0 4px 16px rgba(0,0,0,0.08) | Cards, buttons |
| 3 | 0 8px 24px rgba(0,0,0,0.1) | Elevated cards |
| 4 | 0 12px 32px rgba(0,0,0,0.12) | Modals, overlays |

### Shadow Philosophy
Shadows are soft, modern, and subtle — typical of contemporary SaaS design. They use low-opacity black with moderate blur, creating gentle depth without distraction. The focus is on the vibrant colors and shapes, not the shadows.

---

## 7. Do's and Don'ts

### Do
- Use bright, saturated colors
- Apply flat vector illustration style
- Include abstract geometric shapes
- Use gradient fills on decorative elements
- Maintain clean, modern sans-serif typography
- Create generous whitespace
- Use rounded corners (16px+)
- Include diverse, abstract human figures

### Don't
- Use realistic photography
- Apply outlines to shapes
- Use muted or dull colors
- Create complex textures or patterns
- Use serif or decorative fonts
- Add drop shadows to shapes (flat style)
- Use thin strokes or delicate lines

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
- Decorative shapes reduce on mobile

### Image Behavior
- Vector illustrations scale perfectly
- Maintain flat style
- Colors remain consistent

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#FFFFFF` (White)
- Primary: `#7B68EE` (Memphis Purple)
- Secondary: `#FF8C42` (Memphis Orange)
- Tertiary: `#00C9B7` (Memphis Teal)
- Text: `#2D3748` (Dark Gray)

### Example Component Prompts

1. **Memphis Button:** "Create a primary button with Memphis Purple background, white text, no border, 8px border-radius, 12px 24px padding. On hover, background darkens and translateY(-2px). Clean, modern, flat style."

2. **Memphis Card:** "Design a card with white background, no border, 16px border-radius, 24px padding. Add soft shadow: 0 4px 16px rgba(0,0,0,0.08). Optional geometric blob decoration in corner."

3. **Feature Card:** "Create a feature card with white background, 16px border-radius, 32px padding, larger shadow: 0 8px 24px rgba(0,0,0,0.1). Include flat vector illustration at top."

4. **Stat Card:** "Design a stat card with gradient background from Memphis Purple to Memphis Blue, 16px border-radius, 24px padding. White text. Bold numbers."

5. **Text Input:** "Create a text input with white background, 2px solid Light Gray border, 8px border-radius, 12px 16px padding. Focus state has Memphis Purple border."

6. **Geometric Blob:** "Add an organic, amorphous shape with gradient fill (purple to blue) as background decoration. Low opacity (15%). Used behind content for visual interest."

7. **Navigation:** "Design a top nav with white background, 1px solid Light Gray bottom border. Links in Dark Gray, hover in Memphis Purple. Active has Memphis Purple. Height 64px."

### Iteration Guide

1. **Start with white background:** Establish clean white base.
2. **Add bright colors:** Use saturated purple, orange, teal accents.
3. **Apply flat shapes:** No outlines, solid fills, geometric forms.
4. **Include vector illustrations:** Abstract, disproportionate figures.
5. **Use modern fonts:** Clean sans-serif throughout.
6. **Add geometric decorations:** Blobs, circles, waves as accents.
7. **Verify modern feel:** Everything should feel contemporary and friendly.
