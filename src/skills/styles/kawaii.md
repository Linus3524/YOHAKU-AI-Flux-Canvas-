# Kawaii Design System

A delightfully cute design language inspired by Japanese kawaii culture. Big sparkly eyes, pastel colors, rounded soft shapes, and an overwhelming sense of charm and innocence that makes every interaction feel like a hug from a plush toy.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:** Cute, innocent, playful, warm, affectionate, charming. Like a beloved character from a Japanese stationery brand.

**Emotional Description:** The design evokes the joy of a Sanrio store, a cute bento box, or a pastel stationery set. Everything feels soft, friendly, and designed to make you smile. It's unapologetically adorable.

**Key Characteristics:**
- Big sparkly eyes on characters (when illustrated)
- Rounded, soft, pillowy shapes — zero sharp corners
- Blushing cheeks on characters and decorative elements
- Sparkles, stars, and hearts scattered throughout
- Cute animal and character mascots
- Chibi (super-deformed) proportions
- Pastel color dominance with bright accent pops
- Soft gradients and glows

---

## 2. Color Palette & Roles

### Primary
| Name | Hex | Usage |
|------|-----|-------|
| Baby Pink | `#FFB6C1` | Primary accent, hearts, main cute elements |
| Mint Green | `#98D8C8` | Secondary accent, freshness, balance |
| Lavender | `#E6E6FA` | Tertiary accent, dreamy backgrounds |

### Secondary
| Name | Hex | Usage |
|------|-----|-------|
| Peach | `#FFDAB9` | Warm highlights, skin tones |
| Sky Blue | `#B8E6F0` | Calm elements, sky/water |
| Lemon | `#FFFACD` | Cheerful highlights, stars |

### Interactive
| Name | Hex | Usage |
|------|-----|-------|
| Button Primary | `#FFB6C1` | Primary action buttons |
| Button Hover | `#FF9EAC` | Button hover state |
| Link Blue | `#B8E6F0` | Text links |
| Focus Ring | `#FFB6C1` | Keyboard focus with glow |

### Neutral
| Name | Hex | Usage |
|------|-----|-------|
| Soft Black | `#5A4A4A` | Primary text (never pure black) |
| Warm Gray | `#9A8A8A` | Secondary text, captions |
| Light Gray | `#E8D8D8` | Dividers, borders |

### Surface
| Name | Hex | Usage |
|------|-----|-------|
| Cream Pink | `#FFF5F7` | Primary background |
| White | `#FFFFFF` | Cards, elevated surfaces |
| Blush | `#FFE4E8` | Secondary background, sections |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#98D8C8` | Positive feedback |
| Warning | `#FFDAB9` | Alerts, caution |
| Error | `#FF9EAC` | Errors (softened) |
| Info | `#B8E6F0` | Informational |

---

## 3. Typography Rules

**Font Family:**
- **Headings:** "Mochiy Pop One" or "Kosugi Maru" — rounded, bubbly Japanese-inspired
- **Body:** "Nunito" or "Varela Round" — rounded, soft, friendly
- **Accent:** "Pacifico" or "Cute Font" — for decorative, cute text

### Hierarchy Table

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Mochiy Pop One | 48px | 400 | 1.1 | 0.04em | Hero titles |
| H1 | Mochiy Pop One | 36px | 400 | 1.2 | 0.03em | Section titles |
| H2 | Mochiy Pop One | 28px | 400 | 1.25 | 0.02em | Subsection headers |
| H3 | Nunito | 22px | 700 | 1.3 | 0.01em | Card titles |
| Body | Nunito | 16px | 400 | 1.6 | 0.01em | Paragraph text |
| Body Small | Nunito | 14px | 400 | 1.5 | 0.01em | Captions |
| Label | Nunito | 12px | 700 | 1.4 | 0.03em | Tags, badges |
| Button | Mochiy Pop One | 16px | 400 | 1 | 0.02em | Button text |
| Cute Accent | Pacifico | 18px | 400 | 1.3 | 0.02em | Decorative text |

### Principles
- All fonts must be rounded — no sharp edges
- Wider letter-spacing for airy, cute feel
- Decorative hearts, stars, and sparkles can accompany text
- Soft shadows or glows on headings
- Text can have slight bounce or wobble animation

---

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#FFB6C1` with soft gradient to `#FF9EAC`
- Text: `#5A4A4A`
- Border: 2px solid `#FF9EAC`
- Border-radius: 24px (very rounded, almost pill)
- Padding: 14px 28px
- Shadow: 0 4px 12px `rgba(255, 182, 193, 0.4)` (soft pink glow)
- Hover: Scale 1.05, glow intensifies
- Active: Scale 0.98
- Optional: Small heart or star icon

**Secondary Button**
- Background: `#98D8C8`
- Same rounded, glowy treatment
- Text: `#5A4A4A`

**Icon Button**
- Circular, 48px
- Soft gradient background
- Cute icon (heart, star, sparkle)
- Glow shadow

### Cards & Containers

**Kawaii Card**
- Background: `#FFFFFF`
- Border: 2px solid `#FFE4E8`
- Border-radius: 24px
- Shadow: 0 8px 24px `rgba(255, 182, 193, 0.15)`
- Padding: 24px
- Optional: Decorative corner hearts or stars

**Speech Bubble Card**
- Background: `#FFFFFF`
- Border: 2px solid `#FFB6C1`
- Border-radius: 24px with tail
- Shadow: soft pink glow
- Used for quotes, messages

**Cute Badge**
- Background: `#FFDAB9`
- Border-radius: 999px
- Padding: 6px 14px
- Small decorative element (heart, star)

### Inputs & Forms

**Text Input**
- Background: `#FFFFFF`
- Border: 2px solid `#E8D8D8`
- Border-radius: 16px
- Padding: 14px 18px
- Focus: Border `#FFB6C1`, soft pink glow
- Placeholder: `#9A8A8A`
- Optional: Cute icon inside input

**Checkbox**
- Custom rounded square with 8px radius
- Checkmark: heart shape or sparkle in `#98D8C8`
- Unchecked: empty with `#E8D8D8` border

**Radio Button**
- Custom circle with soft gradient
- Fill: `#FFB6C1` with sparkle

### Navigation

**Top Nav**
- Background: `#FFF5F7`
- Border-bottom: 2px solid `#FFE4E8`
- Links: `#5A4A4A`, hover `#FFB6C1`
- Active: `#FFB6C1` with underline
- Height: 60px

**Sidebar Nav**
- Background: `#FFE4E8`
- Items: Padding 12px 16px, 16px radius
- Active: Background `#FFFFFF`, left border 4px `#FFB6C1`
- Hover: Background `#FFF5F7`

### Image Treatment
- Rounded corners (20px+)
- Soft pink glow border optional
- Characters have big sparkly eyes, blushing cheeks
- Sparkle overlays on important images
- Soft shadow beneath

### Distinctive Components

**Sparkle Decoration**
- 4-point star shape
- Colors: `#FFFACD`, `#FFFFFF`
- Scattered around content
- Subtle pulse animation

**Heart Element**
- Classic heart shape
- Colors from primary palette
- Used as bullet points, decorations, icons

**Blush Marks**
- Oval pink shapes (`#FFB6C1` at 30% opacity)
- Used on characters, cards, decorative elements
- Creates cute, embarrassed, or happy expression

**Cute Mascot Placeholder**
- Small animal or character illustration
- Used for empty states, loading, errors
- Big eyes, blushing cheeks

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
- Grid: 12-column with 20px gutters
- Content padding: 20px (mobile), 40px (desktop)

### Whitespace Philosophy
- Soft, airy layouts with plenty of breathing room
- Elements feel like they're floating on clouds
- Generous padding for pillowy comfort

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| sm | 12px | Small elements |
| md | 16px | Inputs, tags |
| lg | 20px | Cards |
| xl | 24px | Large containers |
| full | 9999px | Pills, badges |

---

## 6. Depth & Elevation

### Elevation Table

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat | Backgrounds |
| 1 | Soft glow | Subtle raised |
| 2 | 0 4px 12px pink glow | Buttons, small cards |
| 3 | 0 8px 24px pink glow | Cards, panels |
| 4 | 0 12px 32px pink glow | Modals, popovers |

### Shadow Philosophy
Shadows are soft, colored glows rather than dark shadows. They use the primary pink color at low opacity to create a dreamy, ethereal depth. The effect is like everything is gently floating in a pastel wonderland.

---

## 7. Do's and Don'ts

### Do
- Use rounded, soft shapes everywhere
- Apply pastel colors generously
- Add sparkle, heart, and star decorations
- Include blushing cheek elements
- Use soft glows instead of dark shadows
- Make everything feel pillowy and soft
- Include cute mascots or characters
- Use wide letter-spacing for airy feel

### Don't
- Use sharp corners or thin borders
- Apply dark, harsh shadows
- Use aggressive or dark colors
- Create angular or geometric designs
- Use serious or formal typography
- Add realistic or gritty textures
- Make elements look heavy or dense

---

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 640px | Single column, stacked |
| Tablet | 640px - 1024px | 2-column grid |
| Desktop | 1024px - 1440px | Full grid |
| Wide | > 1440px | Centered |

### Touch Targets
- Minimum: 48px x 48px
- Buttons: Full-width on mobile
- Input height: 52px minimum

### Collapsing Strategy
- Sidebar to bottom sheet
- Hamburger nav below 768px
- Cards stack vertically

### Image Behavior
- Scale proportionally
- Maintain rounded corners
- Glow effects simplify on mobile

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#FFF5F7` (Cream Pink)
- Primary: `#FFB6C1` (Baby Pink)
- Secondary: `#98D8C8` (Mint Green)
- Accent: `#E6E6FA` (Lavender)
- Text: `#5A4A4A` (Soft Black)

### Example Component Prompts

1. **Kawaii Button:** "Create a primary button with Baby Pink (#FFB6C1) background, soft gradient to lighter pink, dark soft text (#5A4A4A), 2px solid darker pink border, 24px border-radius (very rounded). Add soft pink glow shadow: 0 4px 12px rgba(255,182,193,0.4). On hover, scale 1.05 and glow intensifies. Include a small heart icon."

2. **Kawaii Card:** "Design a card with white background, 2px solid blush pink border, 24px border-radius, 24px padding. Add soft pink glow shadow: 0 8px 24px rgba(255,182,193,0.15). Optional decorative corner hearts."

3. **Kawaii Input:** "Create a text input with white background, 2px solid light pink-gray border, 16px border-radius, 14px 18px padding. Focus state has Baby Pink border with soft glow. Placeholder in warm gray. Optional cute icon inside."

4. **Cute Badge:** "Design a pill badge with Peach (#FFDAB9) background, fully rounded, 6px 14px padding. Add a small heart decoration. Text in soft black."

5. **Speech Bubble:** "Create a speech bubble card with white background, 2px Baby Pink border, 24px border-radius with a small tail. Soft pink glow shadow. Used for messages or quotes."

6. **Sparkle Decoration:** "Add 4-point star sparkles in lemon yellow (#FFFACD) and white, scattered around content with subtle pulse animation."

7. **Kawaii Navigation:** "Design a top nav with Cream Pink background, 2px blush bottom border. Links in soft black, hover in Baby Pink. Active link has Baby Pink color with cute underline."

### Iteration Guide

1. **Start with pastel background:** Establish cream pink (#FFF5F7) base.
2. **Apply rounded shapes:** Ensure all corners are significantly rounded (16px+).
3. **Add soft glows:** Use colored glow shadows instead of dark shadows.
4. **Decorate with cute elements:** Add hearts, stars, sparkles, blush marks.
5. **Use rounded typography:** All fonts must have soft, rounded terminals.
6. **Verify color softness:** Ensure no harsh or dark colors — everything should feel gentle.
7. **Add character charm:** Include cute mascots or character elements where appropriate.
