# Cool — Design System

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Technical, professional, precise — engineered confidence
- **Emotional Description:** Clarity and competence; evokes blueprints, clean code, and well-organized systems
- **Key Characteristics:**
  - Clean, structured layouts with clear visual hierarchy
  - Engineering-blue dominance with precise accent placement
  - Grid-aligned elements with visible structure
  - Data-forward presentation with readable metrics
  - Professional photography with cool, even lighting

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Engineering Blue | #2563EB | Primary buttons, links, active states, headers |
| **Secondary** | Navy Blue | #1E3A5F | Deep backgrounds, footer, strong emphasis |
| **Tertiary** | Cyan | #06B6D4 | Highlights, data visualizations, progress indicators |
| **Background** | Light Gray | #F8F9FA | Main page background |
| **Background Alt** | Blueprint Off-White | #FAF8F5 | Cards, panels, code blocks |
| **Accent 1** | Amber | #F59E0B | Warnings, important badges, key metrics |
| **Accent 2** | Light Blue | #BFDBFE | Subtle highlights, hover states, info banners |
| **Surface** | White | #FFFFFF | Elevated cards, modals, dropdowns |
| **Text Primary** | Slate | #1E293B | Headings, body text |
| **Text Secondary** | Cool Gray | #64748B | Captions, metadata, placeholders |
| **Border** | Border Gray | #E2E8F0 | Dividers, input borders, table lines |
| **Semantic Success** | Green | #10B981 | Success states, confirmations |
| **Semantic Error** | Red | #EF4444 | Error states, alerts |
| **Semantic Info** | Blue | #3B82F6 | Info messages |

---

## 3. Typography Rules

**Font Family:**
- **Primary:** "Inter" or "Roboto" — clean, highly legible sans-serif
- **Headings:** "Inter" — consistent, modern
- **Mono:** "JetBrains Mono" or "Fira Code" — for code, data, technical labels

**Hierarchy:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | Inter | 48px / 3rem | 800 | 1.1 | -0.03em | Hero headlines |
| H1 | Inter | 36px / 2.25rem | 700 | 1.2 | -0.02em | Page titles |
| H2 | Inter | 28px / 1.75rem | 700 | 1.25 | -0.01em | Section headers |
| H3 | Inter | 22px / 1.375rem | 600 | 1.3 | 0 | Card titles |
| H4 | Inter | 18px / 1.125rem | 600 | 1.4 | 0 | Subsection |
| Body | Inter | 16px / 1rem | 400 | 1.6 | 0 | Main text |
| Body Small | Inter | 14px / 0.875rem | 400 | 1.5 | 0 | Captions, metadata |
| Label | Inter | 12px / 0.75rem | 500 | 1.4 | 0.05em | Uppercase labels |
| Mono | JetBrains Mono | 14px / 0.875rem | 400 | 1.5 | 0 | Code, data values |
| Button | Inter | 14px / 0.875rem | 600 | 1 | 0.01em | All buttons |

**Principles:**
- Consistent Inter usage creates a unified, professional feel
- Mono font for any technical data, API endpoints, or metrics
- Tight letter-spacing on large headings for impact
- Clear weight differentiation (400 vs 600 vs 700 vs 800)

---

## 4. Component Stylings

### Buttons
- **Primary:** Background #2563EB, text white, border-radius 6px, padding 10px 20px
- **Secondary:** Background #F8F9FA, border 1px solid #E2E8F0, text #1E293B
- **Tertiary / Text:** Transparent, text #2563EB, underline on hover
- **Danger:** Background #EF4444, text white
- **Hover:** Background darkens 8%, subtle shadow appears

### Cards & Containers
- Background: #FFFFFF
- Border-radius: 8px
- Border: 1px solid #E2E8F0
- Shadow: 0 1px 3px rgba(30,58,95,0.08)
- Padding: 24px
- Optional: Top colored border (3px #2563EB) for featured cards

### Inputs & Forms
- Background: #FFFFFF
- Border: 1px solid #E2E8F0
- Border-radius: 6px
- Focus: Border #2563EB, ring 0 0 0 3px #BFDBFE
- Placeholder: #94A3B8
- Error: Border #EF4444, red focus ring

### Navigation
- Background: #FFFFFF with bottom border #E2E8F0
- Links: Inter 14px, weight 500
- Active: #2563EB with bottom border indicator
- Hover: Background #F8F9FA

### Image Treatment
- Clean, even lighting
- Optional subtle blue tint overlay for cohesion
- Border-radius: 8px for contained images
- Diagrams and schematics in blueprint style (navy lines on off-white)

### Distinctive Components
- **Metric Card:** Large mono number (#1E293B), small label above in cool gray, optional cyan trend indicator
- **Code Block:** Background #1E3A5F, text #BFDBFE, JetBrains Mono, 8px radius
- **Status Badge:** Pill shape, color-coded by semantic meaning
- **Data Table:** Clean lines, hover row highlight #F8F9FA, sorted column indicator in cyan

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
- Structured and intentional — every pixel has purpose
- Section vertical spacing: 48–80px
- Consistent alignment to grid
- Information density appropriate to context (higher for dashboards, lower for marketing)

### Border Radius Scale
- sm: 4px (tags, small buttons)
- md: 6px (buttons, inputs)
- lg: 8px (cards, panels)
- xl: 12px (modals, larger containers)
- full: 9999px (status badges, avatars)

---

## 6. Depth & Elevation

| Level | Treatment | Use Case |
|-------|-----------|----------|
| 0 | Flat, border only | Base layout, tables |
| 1 | 0 1px 3px rgba(30,58,95,0.08) | Cards at rest |
| 2 | 0 4px 6px rgba(30,58,95,0.1) | Hover cards, dropdowns |
| 3 | 0 10px 15px rgba(30,58,95,0.12) | Modals, popovers |
| 4 | 0 20px 25px rgba(30,58,95,0.15) | Full-screen overlays |

**Shadow Philosophy:** Shadows are cool-toned (navy undertones) and restrained. Elevation increases subtly — the aesthetic values flat precision over dramatic depth. Use borders alongside shadows for clarity.

---

## 7. Do's and Don'ts

**Do:**
- Use grid lines and alignment guides as visible design elements
- Maintain consistent spacing and alignment
- Use mono fonts for technical content
- Employ high contrast for readability
- Use amber (#F59E0B) sparingly for critical callouts
- Include dimension indicators and measurement labels where appropriate

**Don't:**
- Use warm colors (oranges, reds, browns) as primary palette
- Create organic, flowing shapes — keep it geometric and precise
- Use decorative flourishes or ornamental details
- Use gradients on buttons or backgrounds (flat colors only)
- Use playful or casual typography
- Overuse cyan — it's an accent, not a primary

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, stacked cards, hamburger nav |
| Tablet | 640–1024px | 2 columns, maintained structure |
| Desktop | > 1024px | Full grid, sidebars, data tables visible |

**Touch Targets:** Minimum 44x44px

**Collapsing Strategy:**
- Navigation collapses to hamburger below 768px
- Data tables scroll horizontally or collapse to card view
- Multi-column layouts stack vertically
- Code blocks maintain horizontal scroll

**Image Behavior:**
- Diagrams scale proportionally
- Hero images: center crop, maintain focus

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary: #2563EB (Engineering Blue)
- Secondary: #1E3A5F (Navy Blue)
- Accent: #06B6D4 (Cyan)
- Warning: #F59E0B (Amber)
- Background: #F8F9FA (Light Gray)
- Text: #1E293B (Slate)

### Example Component Prompts

1. **Technical Hero Section:** "Create a hero section with light gray background, large Inter headline in slate, engineering blue CTA button, and a blueprint-style technical illustration with navy lines on off-white."

2. **Metric Dashboard Card:** "Design a metric card with white background, thin border, large JetBrains Mono number in slate, small uppercase label in cool gray, and a cyan upward trend arrow with percentage."

3. **API Documentation Block:** "Build a code documentation component with navy background (#1E3A5F), JetBrains Mono text in light blue, 8px border-radius, and a copy button in the top right."

4. **Status Table:** "Create a data table with white rows, light gray header, cool gray borders, hover highlight, and status badges (green for active, amber for warning, red for error)."

5. **Technical Navigation:** "Design a top navigation with white background, bottom border, Inter links with engineering blue active indicator, and a navy 'Documentation' button."

6. **Feature Card Grid:** "Build a 3-column feature card grid with white cards, 8px radius, engineering blue icons, Inter headings, and cool gray body text on light gray background."

### Iteration Guide
1. Start with light gray background and slate text
2. Add engineering blue for all primary actions and links
3. Introduce navy for deep sections, footers, or code blocks
4. Use cyan sparingly for data highlights and progress
5. Reserve amber exclusively for warnings and critical metrics
6. Ensure all interactive elements have clear focus states with blue ring
7. Test information hierarchy — the most important data should be immediately scannable
8. Verify code/diagram contrast meets accessibility standards
