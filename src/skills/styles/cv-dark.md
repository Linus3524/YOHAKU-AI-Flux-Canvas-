# Dark — Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Cinematic, premium, atmospheric — immersive and bold
- **Emotional Description:** Deep, mysterious, and electric; evokes night cityscapes, premium gaming, and cinematic experiences
- **Key Characteristics:**
  - Near-black backgrounds with vibrant neon accents
  - Glowing elements and atmospheric lighting effects
  - High contrast between dark surfaces and bright accents
  - Silhouettes with backlit edges for drama
  - Subtle gradient backgrounds adding depth without clutter

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Electric Purple | #8B5CF6 | Primary buttons, active states, key highlights |
| **Secondary** | Cyan Blue | #06B6D4 | Secondary actions, glow effects, data viz |
| **Tertiary** | Magenta Pink | #EC4899 | Accent highlights, gradients, decorative elements |
| **Background** | Deep Purple-Black | #0A0A0A | Main page background |
| **Background Alt** | Rich Navy | #1A1A2E | Cards, panels, elevated surfaces |
| **Accent 1** | Amber | #F59E0B | Warnings, important badges, energy accents |
| **Accent 2** | Pure White | #FFFFFF | Primary text, critical highlights |
| **Surface** | Dark Gray | #1F1F1F | Input backgrounds, secondary cards |
| **Surface Elevated** | Charcoal | #2D2D3A | Modals, dropdowns, tooltips |
| **Text Primary** | White | #FFFFFF | Headings, primary text |
| **Text Secondary** | Cool Gray | #A1A1AA | Body text, captions, metadata |
| **Text Muted** | Gray | #71717A | Placeholders, disabled states |
| **Border** | Dark Border | #27272A | Dividers, input borders |
| **Semantic Success** | Neon Green | #22C55E | Success states |
| **Semantic Error** | Bright Red | #EF4444 | Error states |

---

## 3. Typography Rules

**Font Family:**
- **Primary:** "Inter" or "SF Pro Display" — clean, modern sans-serif
- **Headings:** "Space Grotesk" or "Outfit" — slightly geometric, tech-forward
- **Mono:** "JetBrains Mono" — for code, technical data

**Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Space Grotesk | 56px / 3.5rem | 700 | 1.1 | -0.02em | Hero headlines |
| H1 | Space Grotesk | 40px / 2.5rem | 700 | 1.15 | -0.01em | Page titles |
| H2 | Space Grotesk | 32px / 2rem | 700 | 1.2 | 0 | Section headers |
| H3 | Space Grotesk | 24px / 1.5rem | 600 | 1.3 | 0 | Card titles |
| H4 | Space Grotesk | 20px / 1.25rem | 600 | 1.4 | 0.01em | Subsection |
| Body | Inter | 16px / 1rem | 400 | 1.6 | 0 | Main text |
| Body Small | Inter | 14px / 0.875rem | 400 | 1.5 | 0 | Captions, metadata |
| Label | Inter | 12px / 0.75rem | 500 | 1.4 | 0.05em | Uppercase labels |
| Mono | JetBrains Mono | 14px / 0.875rem | 400 | 1.5 | 0 | Code, data |
| Button | Inter | 14px / 0.875rem | 600 | 1 | 0.02em | All buttons |

**Principles:**
- White text on dark backgrounds for maximum impact
- Cool gray for secondary text to reduce eye strain
- Slightly larger font sizes than light themes for readability
- Glow effects on important headings (text-shadow with primary color)

---

## 4. Component Stylings

### Buttons
- **Primary:** Background #8B5CF6, text white, border-radius 8px, padding 12px 24px, box-shadow 0 0 20px rgba(139,92,246,0.3)
- **Secondary:** Background transparent, border 1px solid #06B6D4, text #06B6D4
- **Glow:** Background gradient (purple to cyan), text white, strong glow effect
- **Hover:** Brighten background, intensify glow, subtle scale 1.02

### Cards & Containers
- Background: #1A1A2E or #1F1F1F
- Border-radius: 12px
- Border: 1px solid #27272A
- Shadow: 0 4px 20px rgba(0,0,0,0.5)
- Optional: Gradient border (1px, purple to cyan)
- Padding: 24px

### Inputs & Forms
- Background: #1F1F1F
- Border: 1px solid #27272A
- Border-radius: 8px
- Focus: Border #8B5CF6, glow 0 0 0 3px rgba(139,92,246,0.2)
- Placeholder: #71717A
- Text: #FFFFFF

### Navigation
- Background: #0A0A0A with subtle bottom border #27272A
- Links: Inter, cool gray
- Active: White with purple underline or glow
- Hover: Text brightens to white

### Image Treatment
- Dark, moody photography with high contrast
- Neon edge lighting effects
- Optional color overlays (purple/cyan at low opacity)
- Silhouettes with colored backlighting

### Distinctive Components
- **Glow Badge:** Pill shape with neon background and matching glow shadow
- **Gradient Border Card:** Card with 1px gradient border (purple → cyan → magenta)
- **Neon Stat:** Large number with text-shadow glow in accent color
- **Dark Code Block:** Background #0A0A0A, syntax highlighting in neon colors

---

## 5. Layout Principles

### Spacing System
Base unit: 4px
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### Grid & Container
- Max container width: 1280px
- Grid: 12-column, gutter 24px
- Page padding: 24px (mobile), 48px (desktop)

### Whitespace Philosophy
- Dark themes can handle more density without feeling cluttered
- Use glow and color to create visual separation instead of whitespace alone
- Section vertical spacing: 64–96px
- Dramatic spacing around hero elements for impact

### Border Radius Scale
- sm: 6px (tags, small buttons)
- md: 8px (buttons, inputs)
- lg: 12px (cards, panels)
- xl: 16px (modals, hero containers)
- full: 9999px (pills, avatars)

---

## 6. Depth & Elevation

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat, dark surface | Base background |
| 1 | Subtle light border top (#27272A) | Cards at rest |
| 2 | 0 4px 12px rgba(0,0,0,0.4) | Hover cards |
| 3 | 0 8px 24px rgba(0,0,0,0.5), glow | Modals, featured cards |
| 4 | 0 16px 48px rgba(0,0,0,0.6), strong glow | Full-screen overlays |

**Shadow Philosophy:** Shadows are deep and dark (black-based). Elevation is often communicated through colored glow effects rather than traditional shadows. The aesthetic is atmospheric — light emanates from elements rather than casting shadows.

---

## 7. Do's and Don'ts

**Do:**
- Use vibrant neon accents against dark backgrounds for maximum pop
- Add subtle glow effects to interactive elements
- Use gradients (purple → cyan → magenta) for decorative accents
- Maintain high contrast for text readability
- Use dark, moody photography with colored lighting
- Add atmospheric effects like subtle fog or particles

**Don't:**
- Use light or white backgrounds — destroys the cinematic feel
- Overuse pure white text — mix with cool gray for hierarchy
- Use warm earth tones — they clash with the neon aesthetic
- Make everything glow — reserve glow for key elements
- Use flat, boring dark grays — add subtle variation (navy tints, purple tints)
- Forget accessibility — ensure sufficient contrast ratios

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, stacked cards, hamburger nav |
| Tablet | 640–1024px | 2 columns, maintained atmosphere |
| Desktop | > 1024px | Full grid, sidebars, maximum glow effects |

**Touch Targets:** Minimum 44x44px

**Collapsing Strategy:**
- Navigation collapses to hamburger with glow accent
- Cards stack vertically on mobile
- Reduce glow intensity on mobile for performance
- Typography scales down 15% on mobile

**Image Behavior:**
- Hero images: full-bleed, dark overlay for text legibility
- Maintain neon color grading across all imagery

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: #8B5CF6 (Electric Purple)
- Secondary: #06B6D4 (Cyan Blue)
- Accent: #EC4899 (Magenta Pink)
- Background: #0A0A0A (Deep Purple-Black)
- Surface: #1A1A2E (Rich Navy)
- Text: #FFFFFF (White)

### Example Component Prompts

1. **Cinematic Hero Section:** "Create a dark hero section with deep purple-black background, large Space Grotesk headline in white with subtle purple text-shadow glow, electric purple CTA button with glow effect, and atmospheric particle animation."

2. **Neon Feature Card:** "Design a card with rich navy background, 12px border-radius, thin gradient border (purple to cyan), white heading, cool gray body text, and a cyan icon with glow effect."

3. **Dark Pricing Card:** "Build a pricing card with dark surface background, gradient top border, white plan name, cool gray feature list with cyan checkmarks, and an electric purple CTA button with glow shadow."

4. **Glowing Navigation:** "Create a dark navigation bar with transparent background, cool gray links that glow white on hover, active link with purple underline glow, and a bordered cyan 'Sign Up' button."

5. **Stats Dashboard:** "Design a stats row with dark background, large white numbers with colored glow (purple, cyan, magenta), small cool gray labels, and subtle divider lines."

6. **Dark Code Block:** "Create a code snippet component with near-black background, JetBrains Mono text with syntax highlighting in neon colors (purple for keywords, cyan for strings, magenta for numbers), and a copy button."

### Iteration Guide
1. Start with deep purple-black background (#0A0A0A)
2. Add rich navy (#1A1A2E) for cards and elevated surfaces
3. Use electric purple (#8B5CF6) for primary actions and glows
4. Introduce cyan (#06B6D4) for secondary accents and data
5. Add magenta (#EC4899) sparingly for gradients and highlights
6. Ensure all text meets WCAG contrast on dark backgrounds
7. Add glow effects progressively — start subtle, increase for emphasis
8. Test on actual devices — dark themes with glow can look different on various screens
