# Corporate Design System

Professional business style with navy/gold palette and structured layouts.

---

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Professional, trustworthy, competent, institutional
- **Emotional Tone:** Confident, reliable, sophisticated, approachable
- **Key Characteristics:**
  - Clean lines, structured layouts, and business-appropriate sophistication
  - Projects competence, reliability, and institutional credibility
  - Balances professionalism with approachability through careful whitespace
  - Refined color choices — navy for trust, gold for premium emphasis
  - Data-driven and metrics-focused visual language

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Navy | #1E3A5F | Headlines, key text, primary branding |
| **Secondary** | Light Navy | #3D5A80 | Secondary elements, supporting text |
| **Interactive** | Navy | #1E3A5F | Primary buttons, links, active states |
| **Neutral** | Dark Gray | #4A5568 | Body text, descriptions |
| **Neutral Light** | Light Gray | #F3F4F6 | Background sections, subtle fills |
| **Surface** | Pure White | #FFFFFF | Main slide/page background |
| **Accent** | Gold | #C9A227 | Premium highlights, emphasis, key metrics |
| **Semantic Success** | Corporate Green | #059669 | Positive metrics, success states |
| **Semantic Alert** | Corporate Red | #DC2626 | Attention items, errors, negative metrics |
| **Semantic Warning** | Amber | #F59E0B | Cautions, warnings |

---

## 3. Typography Rules

**Font Families:**
- **Headlines:** Modern geometric sans-serif (Inter, SF Pro, or similar)
- **Body:** Humanist sans-serif (Source Sans Pro style)

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| H1 (Slide Title) | Geometric Sans | 44px | Semi-Bold (600) | 1.2 | -0.02em | Clean, professional, highly legible |
| H2 (Section Title) | Geometric Sans | 32px | Medium (500) | 1.3 | -0.01em | Conveys contemporary business sensibility |
| H3 (Subsection) | Geometric Sans | 24px | Medium (500) | 1.4 | 0 | Consistent professional tone |
| Body | Humanist Sans | 18px | Regular (400) | 1.6 | 0 | Friendly yet professional, optimized for reading |
| Caption / Label | Geometric Sans | 14px | Medium (500) | 1.4 | 0.01em | Metadata, chart labels |
| Data / Metrics | Geometric Sans | 42px | Bold (700) | 1.1 | -0.02em | Large numbers, financial figures |
| Quote / Pullout | Humanist Sans | 22px | Light (300) | 1.5 | 0 | Italic for testimonials or key quotes |

**Principles:**
- Medium to semi-bold weights for headlines convey competence
- Humanist sans-serif for body adds approachability to professionalism
- Comfortable line height (1.6) for extended reading
- Slight negative letter-spacing on large headlines for tighter, more authoritative feel

---

## 4. Component Stylings

### Buttons
- **Primary:** Navy (#1E3A5F) background, white text, 4px border-radius, no border
- **Secondary:** White background, Navy (#1E3A5F) text, 1px solid Navy border, 4px border-radius
- **Accent/Gold:** Gold (#C9A227) background, Navy text, 4px border-radius — for premium CTAs only
- **Ghost:** Transparent background, Navy text, no border — underline on hover

### Cards & Containers
- 4px border-radius
- 1px solid Light Gray (#F3F4F6) border or subtle shadow
- White background for cards on white page background
- Light Gray (#F3F4F6) background for section containers
- Subtle shadow: 0 1px 3px rgba(0,0,0,0.08)

### Inputs & Forms
- 4px border-radius
- 1px solid Light Gray border
- Navy focus state with 2px outline offset
- Humanist sans-serif for input text

### Navigation
- Horizontal nav bar with Navy background or white with Navy text
- Active item: Gold (#C9A227) underline or background highlight
- Clean, structured alignment

### Image Treatment
- Professional photography preferred
- Images should feel authentic and business-appropriate
- Subtle rounded corners (4px) on images
- Optional subtle overlay for text-on-image scenarios

### Distinctive Components
- **Data Charts:** Clean, minimal charts with Navy primary and Gold accent
- **Progress Bars:** Navy track, Gold fill for progress
- **Metric Cards:** Large bold numbers with descriptive labels below
- **Organizational Charts:** Clean boxes with 1px borders, structured hierarchy
- **Timeline Graphics:** Horizontal or vertical with Gold milestone markers
- **Comparison Tables:** Clean rows with alternating white/Light Gray backgrounds

---

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Margins: 12-15% on all sides for presentations
- Gap between elements: 16px (small), 24px (medium), 40px (large)
- Section spacing: 48px minimum between major sections

### Grid & Container
- 12-column grid for maximum flexibility
- Structured grid alignment for all elements
- Containers max-width: 1200px for content
- Consistent gutter widths (24px)

### Whitespace Philosophy
- Generous whitespace conveys professionalism and premium quality
- Empty space is intentional — avoids cluttered, amateurish appearance
- Balance density with breathing room

### Border Radius Scale
- Small (4px): Buttons, inputs, small cards, images
- Medium (8px): Large cards, containers, modals
- Large (0px): Full-width sections, headers (sharp)

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 (Flat) | No shadow, 1px border | Default cards, static content |
| 1 (Subtle) | 0 1px 3px rgba(0,0,0,0.08) | Slightly elevated cards, hover states |
| 2 (Raised) | 0 4px 12px rgba(0,0,0,0.1) | Dropdowns, floating panels, modals |
| 3 (Prominent) | 0 8px 24px rgba(0,0,0,0.12) | Dialogs, important callouts |

**Shadow Philosophy:** Shadows are subtle and professional. The corporate aesthetic uses elevation sparingly — flat design with minimal depth is preferred. When shadows are used, they are soft, diffuse, and neutral in color. The goal is to create subtle hierarchy without flashy effects. Gold accents provide visual interest instead of dramatic shadows.

---

## 7. Do's and Don'ts

### Do
- Maintain clear visual hierarchy through scale, weight, and color
- Use consistent grid alignment for all elements
- Apply accent colors strategically (Gold for emphasis, Green/Red for metrics)
- Keep data visualizations clean and readable
- Use professional outlined iconography
- Balance whitespace with content density
- Use Navy as the dominant brand color
- Present metrics prominently with large numbers

### Don't
- Use playful or casual elements (cartoons, informal illustrations)
- Apply heavy decorative effects (gradients, glows, heavy shadows)
- Mix too many accent colors — stick to the defined palette
- Crowd slides/pages with excessive information
- Use informal illustration styles or hand-drawn elements
- Use bright, saturated colors outside the defined palette
- Add slide numbers, footers, or logos (for presentation decks)
- Use more than one Gold element per view — it's for emphasis only

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >= 1280px | Full multi-column layouts, side-by-side metrics |
| Tablet | 768px - 1279px | Reduced columns, stacked metric cards |
| Mobile | < 768px | Single column, simplified charts, larger touch targets |

**Touch Targets:** Minimum 44x44px for interactive elements

**Collapsing Strategy:**
- Multi-column metric cards stack to 2-column then single column
- Side-by-side content stacks vertically
- Navigation collapses to hamburger menu on mobile
- Charts simplify or switch to vertical orientation

**Image Behavior:**
- Images scale proportionally within containers
- Professional photos maintain aspect ratio
- Data visualizations reflow to fit container width

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: #FFFFFF (Pure White)
- Primary Text: #1E3A5F (Navy)
- Secondary Text: #4A5568 (Dark Gray)
- Primary Accent: #C9A227 (Gold)
- Secondary Accent: #3D5A80 (Light Navy)
- Success: #059669 (Corporate Green)
- Error: #DC2626 (Corporate Red)
- Section Background: #F3F4F6 (Light Gray)

### Example Component Prompts

1. **Executive Summary Card:** "Create a metric summary card with a large bold number (42px, Navy #1E3A5F) showing revenue growth. Label below in Dark Gray (#4A5568). Card has white background, 4px border-radius, subtle shadow (0 1px 3px rgba(0,0,0,0.08)). A small Gold (#C9A227) up-arrow icon indicates positive trend."

2. **Quarterly Report Chart:** "Design a bar chart for quarterly revenue. Navy (#1E3A5F) bars for standard quarters, Gold (#C9A227) bar for the current/highlighted quarter. Clean axes with Dark Gray labels. White background, minimal grid lines in Light Gray (#F3F4F6). No chart border."

3. **Team Org Chart:** "Build an organizational chart with rectangular boxes (4px radius, 1px Light Gray border). Connecting lines in Light Navy (#3D5A80). Names in Navy semi-bold, titles in Dark Gray regular. White background, structured hierarchy with clear reporting lines."

4. **Project Timeline:** "Create a horizontal project timeline. Milestone markers are Gold (#C9A227) circles on a Light Navy (#3D5A80) line. Past milestones filled, future milestones outlined. Labels below in Dark Gray. Clean, structured layout with equal spacing."

5. **Comparison Table:** "Design a professional comparison table with Navy (#1E3A5F) header row (white text). Alternating white and Light Gray (#F3F4F6) data rows. 1px borders between rows. Dark Gray body text. Gold checkmarks for positive features. Sharp, clean alignment."

6. **Investor Pitch Slide:** "Create a title slide with Navy (#1E3A5F) headline in large geometric sans-serif. Subtitle in Dark Gray (#4A5568). A single Gold (#C9A227) accent line beneath the title. Pure white background. Generous margins (15%). Clean, confident, professional."

### Iteration Guide
1. Establish the white background and Navy text foundation first
2. Add content with clear hierarchy (large headlines, readable body)
3. Apply Gold accents sparingly — only for key emphasis points
4. Add data visualizations with Navy primary and Gold highlight
5. Use Light Gray (#F3F4F6) for section backgrounds or alternating rows
6. Apply subtle shadows only when elevation is functionally needed
7. Review for professionalism — remove anything playful or casual
8. Ensure Gold is used no more than 1-2 times per view to maintain its impact
