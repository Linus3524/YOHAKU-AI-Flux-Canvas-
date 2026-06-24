# Bold Graphic Design System

A high-impact, high-contrast design language inspired by comic books and pop art. Bold outlines, dramatic halftone patterns, and energetic compositions create visual impact that demands attention.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:** Bold, energetic, dramatic, attention-grabbing, confident. Like a comic book splash page or a Warhol silkscreen.

**Emotional Description:** The design evokes the excitement of opening a new comic book — the crack of action lines, the punch of primary colors, the drama of bold outlines. It's loud, proud, and impossible to ignore.

**Key Characteristics:**
- Bold black outlines on all elements
- High contrast compositions
- Halftone dot patterns
- Comic panel borders optional
- Action lines and motion effects
- Speech bubbles and sound effects
- Primary color dominance
- Dramatic, dynamic layouts

---

## 2. Color Palette & Roles

### Primary
| Name | Hex | Usage |
|------|-----|-------|
| Comic Red | `#E63946` | Primary accent, action, energy |
| Comic Blue | `#1D3557` | Secondary accent, depth, trust |
| Comic Yellow | `#F1C453` | Highlights, attention, optimism |

### Secondary
| Name | Hex | Usage |
|------|-----|-------|
| Comic Black | `#1A1A1A` | Outlines, text, shadows |
| White | `#FFFFFF` | Backgrounds, contrast |
| Halftone Gray | `#B8B8B8` | Patterns, texture |

### Interactive
| Name | Hex | Usage |
|------|-----|-------|
| Button Primary | `#E63946` | Primary actions |
| Button Hover | `#FF4D5A` | Hover state |
| Link | `#1D3557` | Text links |
| Focus Ring | `#F1C453` | Focus indicators |

### Neutral
| Name | Hex | Usage |
|------|-----|-------|
| Dark Gray | `#4A4A4A` | Secondary text |
| Mid Gray | `#8A8A8A` | Captions, metadata |
| Light Gray | `#E8E8E8` | Dividers, backgrounds |

### Surface
| Name | Hex | Usage |
|------|-----|-------|
| White | `#FFFFFF` | Primary background |
| Off-White | `#F8F8F8` | Secondary background |
| Halftone | `#F0F0F0` | Patterned backgrounds |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#4CAF50` | Positive feedback |
| Warning | `#FF9800` | Alerts |
| Error | `#E63946` | Errors |
| Info | `#2196F3` | Informational |

---

## 3. Typography Rules

**Font Family:**
- **Headings:** "Bangers" or "Luckiest Guy" — comic book impact
- **Body:** "Comic Neue" or "Patrick Hand" — readable, friendly
- **Accent:** "Permanent Marker" — for emphasis, sound effects

### Hierarchy Table

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Bangers | 64px | 400 | 1 | 0.04em | Hero titles, impact |
| H1 | Bangers | 48px | 400 | 1.1 | 0.03em | Section titles |
| H2 | Bangers | 36px | 400 | 1.15 | 0.02em | Subsection headers |
| H3 | Comic Neue | 24px | 700 | 1.3 | 0.01em | Card titles |
| Body | Comic Neue | 16px | 400 | 1.6 | 0.01em | Paragraph text |
| Body Small | Comic Neue | 14px | 400 | 1.5 | 0.01em | Captions |
| Label | Comic Neue | 12px | 700 | 1.4 | 0.03em | Tags, labels |
| Button | Bangers | 18px | 400 | 1 | 0.02em | Button text |
| SFX | Permanent Marker | 24px | 400 | 1.2 | 0.05em | Sound effects |

### Principles
- Headings are bold, impactful, slightly tilted
- Body text is readable with comic feel
- Sound effects (POW, BANG) in accent font
- Text can have outline effect
- Uppercase for maximum impact headings

---

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#E63946`
- Text: `#FFFFFF`
- Border: 3px solid `#1A1A1A` (thick comic outline)
- Border-radius: 0 (sharp corners)
- Padding: 14px 28px
- Text-shadow: 2px 2px 0 `#1A1A1A`
- Hover: Scale 1.05, outline thickens
- Active: Scale 0.98

**Secondary Button**
- Background: `#1D3557`
- Same outline treatment
- Text: `#FFFFFF`

**Action Button**
- Background: `#F1C453`
- Border: 3px solid `#1A1A1A`
- Text: `#1A1A1A`
- Tilted slightly (-2deg)

### Cards & Containers

**Comic Panel**
- Background: `#FFFFFF`
- Border: 3px solid `#1A1A1A`
- Border-radius: 0
- Padding: 24px
- Optional: Halftone pattern background

**Speech Bubble**
- Background: `#FFFFFF`
- Border: 3px solid `#1A1A1A`
- Border-radius: 50% (oval)
- Tail pointing to speaker
- Padding: 16px 20px

**Sound Effect Box**
- Background: `#F1C453`
- Border: 3px solid `#1A1A1A`
- Tilted angle
- Bold text: "POW!", "BAM!"

### Inputs & Forms

**Text Input**
- Background: `#FFFFFF`
- Border: 3px solid `#1A1A1A`
- Border-radius: 0
- Padding: 12px 16px
- Focus: Border `#E63946`
- Placeholder: `#8A8A8A`

**Textarea**
- Same as text input
- Min-height: 120px

**Checkbox**
- Custom square with thick border
- Checkmark: bold stroke
- Unchecked: empty with border

### Navigation

**Top Nav**
- Background: `#FFFFFF`
- Border-bottom: 3px solid `#1A1A1A`
- Links: `#1A1A1A`, hover `#E63946`
- Active: `#E63946` with underline
- Height: 64px

**Sidebar Nav**
- Background: `#F8F8F8`
- Items: Padding 12px 16px
- Active: Background `#FFFFFF`, left border 4px `#E63946`
- Hover: Background `#FFFFFF`

### Image Treatment
- Bold black outline around images
- Halftone dot pattern overlay optional
- High contrast treatment
- Comic-style framing

### Distinctive Components

**Halftone Pattern**
- Dot pattern background
- Color: `#B8B8B8` or primary
- Used for texture, shadows
- Classic comic book effect

**Action Lines**
- Radiating lines from action
- Used for emphasis, motion
- Black lines on white or reverse

**Comic Divider**
- Zigzag or jagged line
- Thick, bold
- Color: `#1A1A1A`

**Starburst**
- Explosion shape for emphasis
- Background: `#F1C453`
- Border: 3px solid `#1A1A1A`
- Used for badges, highlights

---

## 5. Layout Principles

### Spacing System
| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps |
| sm | 8px | Inline spacing |
| md | 16px | Standard padding |
| lg | 24px | Panel padding |
| xl | 32px | Section gaps |
| 2xl | 48px | Major separations |

### Grid & Container
- Max container width: 1200px
- Grid: 12-column with 24px gutters
- Content padding: 24px (mobile), 48px (desktop)
- Dynamic, angled layouts encouraged

### Whitespace Philosophy
- White space is crisp and clean
- Panels create structure like comic pages
- Generous padding within panels
- Tight gutters between panels

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| none | 0 | Sharp comic corners |
| sm | 4px | Slight rounding |
| full | 50% | Speech bubbles |

---

## 6. Depth & Elevation

### Elevation Table

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat | Backgrounds |
| 1 | Thick outline | Standard elements |
| 2 | Outline + offset | Raised elements |
| 3 | Multiple offsets | Elevated panels |

### Shadow Philosophy
Shadows are created through **thick outlines and offset duplicates** rather than soft shadows. A "shadow" might be a second, offset shape in black behind the main element. This creates the classic comic book pop-art depth effect — bold, graphic, and high-contrast.

---

## 7. Do's and Don'ts

### Do
- Use bold black outlines on everything
- Apply halftone dot patterns
- Create high contrast compositions
- Use primary colors boldly
- Add action lines and motion effects
- Use comic-style speech bubbles
- Create dramatic, dynamic layouts
- Use impact fonts for headings

### Don't
- Use soft shadows or gradients
- Apply thin borders or delicate lines
- Use muted or pastel colors
- Create subtle, understated designs
- Use formal or serif fonts
- Add realistic textures
- Use rounded corners excessively

---

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 640px | Single column, stacked panels |
| Tablet | 640px - 1024px | 2-column grid |
| Desktop | 1024px - 1440px | Full grid |
| Wide | > 1440px | Centered |

### Touch Targets
- Minimum: 44px x 44px
- Buttons: Full-width on mobile
- Input height: 48px minimum

### Collapsing Strategy
- Sidebar to sheet on mobile
- Hamburger nav below 768px
- Panels stack vertically
- Halftone patterns simplify

### Image Behavior
- Scale proportionally
- Maintain bold outline
- Halftone treatment consistent

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#FFFFFF` (White)
- Primary: `#E63946` (Comic Red)
- Secondary: `#1D3557` (Comic Blue)
- Highlight: `#F1C453` (Comic Yellow)
- Outline: `#1A1A1A` (Comic Black)

### Example Component Prompts

1. **Comic Button:** "Create a primary button with Comic Red background, white text, 3px solid Comic Black border, 0 border-radius (sharp corners), 14px 28px padding. Add text-shadow: 2px 2px 0 black. On hover, scale 1.05 and outline thickens."

2. **Comic Panel:** "Design a card with white background, 3px solid Comic Black border, 0 border-radius, 24px padding. Optional halftone dot pattern background."

3. **Speech Bubble:** "Create a speech bubble with white background, 3px solid Comic Black border, 50% border-radius (oval shape), tail pointing down-left. 16px 20px padding."

4. **Text Input:** "Design a text input with white background, 3px solid Comic Black border, 0 border-radius, 12px 16px padding. Focus state has Comic Red border."

5. **Sound Effect:** "Create a sound effect element with Comic Yellow background, 3px solid Comic Black border, tilted -5deg. Bold text 'POW!' in Permanent Marker font."

6. **Starburst Badge:** "Design a starburst badge with Comic Yellow background, 3px solid Comic Black border, starburst/explosion shape. Used for highlights and emphasis."

7. **Navigation:** "Design a top nav with white background, 3px solid Comic Black bottom border. Links in Comic Black, hover in Comic Red. Active has Comic Red with thick underline. Height 64px."

### Iteration Guide

1. **Start with white background:** Establish clean white base.
2. **Apply thick black outlines:** 3px solid black on all elements.
3. **Add primary colors:** Bold red, blue, yellow accents.
4. **Create halftone texture:** Dot patterns for depth and style.
5. **Use impact fonts:** Bold, comic-style typography.
6. **Add comic elements:** Speech bubbles, action lines, sound effects.
7. **Verify high contrast:** Everything should pop with bold clarity.
