# Warm — Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Friendly, approachable, human-centered — like a conversation by a fireplace
- **Emotional Description:** Inviting warmth that builds trust and comfort; evokes sunshine, home, and community
- **Key Characteristics:**
  - Golden-hour warmth permeates every surface
  - Organic, rounded forms feel hand-crafted and personal
  - Generous whitespace with warm-tinted backgrounds (never cold gray)
  - Human-centric imagery with warm lighting and natural skin tones
  - Playful accents balanced by grounded earth tones

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Warm Orange | #ED8936 | CTAs, primary buttons, key highlights, active states |
| **Secondary** | Golden Yellow | #F6AD55 | Secondary buttons, badges, hover states, icons |
| **Tertiary** | Terracotta | #C05621 | Headers, emphasis text, borders, warm accents |
| **Background** | Cream | #FFFAF0 | Main page background, cards, panels |
| **Background Alt** | Soft Peach | #FED7AA | Subtle section backgrounds, hover surfaces, tags |
| **Accent 1** | Deep Brown | #744210 | Body text, headings, strong emphasis |
| **Accent 2** | Soft Red | #E53E3E | Error states, alerts, important notifications, likes/hearts |
| **Surface** | Warm White | #FFF5E6 | Elevated cards, modals, dropdowns |
| **Border** | Warm Sand | #F0D9B5 | Dividers, input borders, card outlines |
| **Semantic Success** | Olive Green | #68A357 | Success messages, confirmations |
| **Semantic Info** | Sky Amber | #F6AD55 | Info banners, tips (reuses secondary) |

---

## 3. Typography Rules

**Font Family:**
- **Primary:** "Nunito" or "Quicksand" — rounded, friendly sans-serif
- **Headings:** "Poppins" — modern geometric with warmth
- **Mono (optional):** "JetBrains Mono" — for code snippets

**Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Poppins | 48px / 3rem | 700 | 1.1 | -0.02em | Hero headlines |
| H1 | Poppins | 36px / 2.25rem | 700 | 1.2 | -0.01em | Page titles |
| H2 | Poppins | 28px / 1.75rem | 600 | 1.3 | 0 | Section headers |
| H3 | Poppins | 22px / 1.375rem | 600 | 1.4 | 0 | Card titles |
| H4 | Poppins | 18px / 1.125rem | 600 | 1.4 | 0.01em | Subsection |
| Body | Nunito | 16px / 1rem | 400 | 1.7 | 0.01em | Main text |
| Body Small | Nunito | 14px / 0.875rem | 400 | 1.6 | 0.01em | Captions, metadata |
| Label | Nunito | 12px / 0.75rem | 600 | 1.4 | 0.05em | Uppercase labels |
| Button | Nunito | 16px / 1rem | 600 | 1 | 0.02em | All buttons |

**Principles:**
- Headings in Deep Brown (#744210) for warmth; avoid pure black
- Body text in a slightly softened dark tone (#5C4033)
- Generous line-height (1.6–1.7) for readability and breathing room

---

## 4. Component Stylings

### Buttons
- **Primary:** Background #ED8936, text white, border-radius 12px, padding 12px 24px, shadow 0 2px 8px rgba(237,137,54,0.3)
- **Secondary:** Background #F6AD55, text #744210, border-radius 12px
- **Tertiary / Ghost:** Transparent background, border 2px solid #ED8936, text #ED8936
- **Hover:** Scale 1.02, brighten background 10%, shadow deepens

### Cards & Containers
- Background: #FFFAF0 or #FFF5E6
- Border-radius: 16px
- Border: 1px solid #F0D9B5 (subtle)
- Shadow: 0 4px 12px rgba(116,66,16,0.08)
- Padding: 24px

### Inputs & Forms
- Background: #FFFFFF
- Border: 2px solid #F0D9B5
- Border-radius: 12px
- Focus: Border #ED8936, glow 0 0 0 3px rgba(237,137,54,0.2)
- Placeholder: #C4A882

### Navigation
- Background: #FFFAF0 with subtle bottom border
- Active item: #ED8936 underline or pill background
- Hover: Background #FED7AA

### Image Treatment
- Warm overlay filter: subtle orange tint at 5–10% opacity
- Border-radius: 16px for images in cards
- Soft vignette on hero images

### Distinctive Components
- **Warm Badge:** Pill shape, background #FED7AA, text #744210
- **Quote Block:** Left border 4px #ED8936, background #FFF5E6, italic Nunito
- **Avatar Ring:** 3px solid #F6AD55

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
- Max container width: 1200px
- Grid: 12-column, gutter 24px
- Page padding: 24px (mobile), 48px (desktop)

### Whitespace Philosophy
- Generous, breathable layouts — warmth needs room to breathe
- Section vertical spacing: 64–96px
- Card internal spacing: 24px

### Border Radius Scale
- sm: 8px (buttons small, tags)
- md: 12px (inputs, buttons)
- lg: 16px (cards, panels)
- xl: 24px (modals, hero containers)
- full: 9999px (pills, avatars)

---

## 6. Depth & Elevation

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | No shadow, flat | Base layers, inactive |
| 1 | 0 2px 4px rgba(116,66,16,0.06) | Cards at rest |
| 2 | 0 4px 12px rgba(116,66,16,0.08) | Hover cards, dropdowns |
| 3 | 0 8px 24px rgba(116,66,16,0.12) | Modals, popovers |
| 4 | 0 16px 48px rgba(116,66,16,0.16) | Full-screen overlays |

**Shadow Philosophy:** Shadows carry warm brown undertones (not gray) to maintain the cozy atmosphere. Elevation is gentle — avoid harsh, high-contrast shadows.

---

## 7. Do's and Don'ts

**Do:**
- Use warm-tinted backgrounds instead of pure white or gray
- Round corners generously — sharp edges feel cold
- Pair with human photography featuring warm lighting
- Use gradients blending orange → yellow → peach for hero sections
- Maintain high contrast for accessibility (WCAG AA minimum)

**Don't:**
- Use cool grays, blues, or purples as primary surfaces
- Create sharp, angular geometric patterns
- Use pure black text — always soften to deep brown
- Overload with too many accent colors — keep it warm and cohesive
- Use cold, clinical photography

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, 16px padding, stacked cards |
| Tablet | 640–1024px | 2 columns, 24px padding |
| Desktop | > 1024px | Full grid, 48px padding, sidebars visible |

**Touch Targets:** Minimum 44x44px for all interactive elements

**Collapsing Strategy:**
- Navigation collapses to hamburger menu below 768px
- Cards stack vertically on mobile
- Typography scales down 15–20% on mobile

**Image Behavior:**
- Hero images: maintain aspect ratio, center crop
- Card images: 16:9 ratio, scale to fill

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: #ED8936 (Warm Orange)
- Secondary: #F6AD55 (Golden Yellow)
- Background: #FFFAF0 (Cream)
- Text: #744210 (Deep Brown)
- Accent Alert: #E53E3E (Soft Red)

### Example Component Prompts

1. **Warm Hero Section:** "Create a hero section with a cream (#FFFAF0) background, large Poppins headline in deep brown, warm orange CTA button with rounded corners, and a soft peach gradient overlay on the right side. Include friendly illustration of people."

2. **Community Card:** "Design a card component with 16px border-radius, cream background, warm sand border, avatar with golden ring, Nunito body text, and terracotta-colored metadata tags."

3. **Friendly Form:** "Build a signup form with rounded inputs (12px radius), warm orange focus glow, soft peach section background, and a prominent warm orange submit button."

4. **Warm Navigation:** "Create a top navigation bar with cream background, deep brown logo text, nav items in Nunito that highlight with peach background on hover, and a warm orange primary CTA button."

5. **Testimonial Quote:** "Design a testimonial block with a left terracotta accent border, cream background, italic Nunito quote text, and a small avatar with golden ring and name in deep brown."

6. **Warm Badge System:** "Create a set of pill badges: one with peach background for 'Community', one with soft orange for 'Popular', and one with soft red for 'New'. All with rounded-full radius."

### Iteration Guide
1. Start with the cream background and deep brown text
2. Add warm orange for primary actions only
3. Introduce golden yellow for secondary highlights and hover states
4. Use soft peach for subtle section differentiation
5. Reserve soft red exclusively for errors and alerts
6. Check contrast ratios — warm palettes can fail WCAG if not careful
7. Add warmth through photography and illustration, not just color
