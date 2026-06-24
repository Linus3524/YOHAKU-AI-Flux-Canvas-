# Blueprint Design System

Precise technical blueprint style with professional analytical visual presentation.

---

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Analytical, precise, authoritative, engineering-minded
- **Emotional Tone:** Trustworthy, systematic, intellectually rigorous
- **Key Characteristics:**
  - Clean, structured visual metaphors using blueprints, diagrams, and schematics
  - Information presented in triptych or grid-based layouts with engineering precision
  - Technical drawing aesthetic with consistent line weights and geometric precision
  - Professional editorial quality with restrained color usage
  - Every element serves a communicative purpose — no decorative noise

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Engineering Blue | #2563EB | Key elements, primary highlights, active states |
| **Secondary** | Navy Blue | #1E3A5F | Supporting elements, secondary headings, structural lines |
| **Interactive** | Engineering Blue | #2563EB | Buttons, links, interactive indicators |
| **Neutral** | Deep Slate | #334155 | Primary text, body copy |
| **Neutral Light** | Light Gray | #E5E5E5 | Grid lines, dividers, subtle borders |
| **Surface** | Blueprint Paper | #FAF8F5 | Primary background |
| **Surface Alt** | Light Blue | #BFDBFE | Background fills for diagrams, section tints |
| **Semantic Warning** | Amber | #F59E0B | Warnings, emphasis points, caution indicators |

---

## 3. Typography Rules

**Font Families:**
- **Headlines:** Neue Haas Grotesk Display Pro or similar clean geometric sans-serif
- **Body:** Tiempos Text or similar elegant serif

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| H1 (Slide Title) | Sans-Serif | 48px | Bold (700) | 1.1 | -0.02em | Technical, authoritative presence |
| H2 (Section Title) | Sans-Serif | 32px | Semi-Bold (600) | 1.2 | -0.01em | Precise letterforms |
| H3 (Subsection) | Sans-Serif | 24px | Medium (500) | 1.3 | 0 | Consistent spacing |
| Body | Serif | 18px | Regular (400) | 1.6 | 0 | Clean, readable at smaller sizes |
| Caption / Label | Sans-Serif | 14px | Medium (500) | 1.4 | 0.02em | Technical labels, dimensions |
| Data / Metrics | Sans-Serif | 36px | Bold (700) | 1.0 | -0.03em | Large numbers, key stats |

**Principles:**
- Bold weight for titles conveys technical authority
- Serif body text adds editorial professionalism
- Consistent spacing and alignment throughout
- Scale creates clear visual hierarchy

---

## 4. Component Stylings

### Buttons
- **Primary:** Engineering Blue (#2563EB) background, white text, no border-radius (0px), 1px solid border
- **Secondary:** Transparent background, Navy Blue (#1E3A5F) text, 1px solid Navy Blue border
- **Ghost:** Transparent background, Deep Slate text, no border — text-only with underline on hover

### Cards & Containers
- Sharp corners (0px border-radius)
- 1px solid Light Gray (#E5E5E5) borders
- Light Blue (#BFDBFE) background tints for diagram containers
- No shadows — flat, technical aesthetic

### Inputs & Forms
- 1px solid Light Gray borders
- 0px border-radius
- Engineering Blue focus state with 2px outline
- Monospace font for technical input fields

### Navigation
- Horizontal tab bar with 1px bottom border
- Active tab: Engineering Blue underline (2px)
- Inactive tabs: Deep Slate text

### Image Treatment
- No photographs — all visuals are diagrams, schematics, or vector graphics
- Isometric or orthographic projections preferred
- Clean line art with consistent stroke weights

### Distinctive Components
- **Technical Diagrams:** Cross-section style, dimension lines, measurement indicators
- **Data Visualization:** Clean, minimal charts with restrained palette
- **Connection Lines:** Straight lines or 90-degree angles only
- **Grid Overlay:** Subtle background grid for engineering paper feel

---

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Margins: minimum 15% on all sides for slide decks
- Gap between elements: 16px (small), 24px (medium), 48px (large)

### Grid & Container
- Strict grid alignment for all elements
- Triptych or grid-based layouts preferred
- Engineering paper-style subtle grid overlay on backgrounds
- Containers align to grid, no free-floating elements

### Whitespace Philosophy
- Generous but structured whitespace
- Empty space is intentional and grid-aligned
- No decorative padding — spacing serves hierarchy

### Border Radius Scale
- All corners: 0px (sharp, technical)
- No rounded elements in this system

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 (Flat) | No shadow, 1px solid border | Default cards, containers, diagrams |
| 1 (Subtle) | 1px offset, same-color shadow | Slight emphasis on active elements |
| 2 (Raised) | 2px offset, Light Gray shadow | Dropdowns, modals, floating panels |

**Shadow Philosophy:** Elevation is minimal and functional. Blueprint style avoids decorative shadows. When elevation is needed, use thin offset shadows in neutral tones rather than diffuse drop shadows. The aesthetic is flat and technical — depth is communicated through line weight and scale, not shadow.

---

## 7. Do's and Don'ts

### Do
- Maintain consistent line weights throughout all diagrams
- Use grid alignment for all elements
- Keep color palette restrained and unified
- Create clear visual hierarchy through scale and weight
- Use geometric precision for all shapes
- Apply 90-degree angles for connection lines
- Include dimension lines and measurement indicators
- Use triptych or grid-based layouts

### Don't
- Use hand-drawn or organic shapes
- Add decorative flourishes or ornaments
- Use curved connection lines (stick to straight/orthogonal)
- Include photographic elements
- Use rounded corners on any element
- Apply gradients or glossy effects
- Mix multiple accent colors arbitrarily
- Add slide numbers, footers, or logos

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >= 1280px | Full triptych layouts, side-by-side diagrams |
| Tablet | 768px - 1279px | Stacked triptych, reduced grid columns |
| Mobile | < 768px | Single column, simplified diagrams, larger touch targets |

**Touch Targets:** Minimum 44x44px for interactive elements

**Collapsing Strategy:**
- Side-by-side diagrams stack vertically
- Multi-column grids collapse to single column
- Navigation collapses to hamburger menu on mobile

**Image Behavior:**
- Diagrams scale proportionally
- Complex schematics may need simplified mobile versions
- Dimension text scales with container

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: #FAF8F5 (Blueprint Paper)
- Primary Text: #334155 (Deep Slate)
- Primary Accent: #2563EB (Engineering Blue)
- Secondary Accent: #1E3A5F (Navy Blue)
- Warning: #F59E0B (Amber)
- Grid Lines: #E5E5E5 (Light Gray)

### Example Component Prompts

1. **Technical Architecture Diagram:** "Create a system architecture diagram in blueprint style. Use Engineering Blue (#2563EB) for primary connections, Navy Blue (#1E3A5F) for secondary elements. Sharp corners, 1px consistent line weights, 90-degree connection angles. Label each component with sans-serif captions. Background: Blueprint Paper (#FAF8F5) with subtle grid overlay."

2. **Data Flow Schematic:** "Design a data flow schematic with straight orthogonal connection lines. Use Amber (#F59E0B) for warning/validation nodes. Include dimension-style labels. Flat design, no shadows, sharp corners throughout."

3. **Process Flow Diagram:** "Build a step-by-step process flow in blueprint aesthetic. Each step is a sharp-cornered rectangle with 1px Light Gray border. Active step highlighted with Engineering Blue. Connection arrows are straight lines with triangular heads."

4. **Comparison Table:** "Create a technical comparison table with sharp corners, 1px borders, and alternating row tints of Light Blue (#BFDBFE). Headers in bold sans-serif, body in serif. No rounded elements."

5. **Metrics Dashboard Card:** "Design a metrics display card showing key statistics. Large bold numbers in sans-serif, labels in serif. Sharp corners, 1px border, no shadow. Engineering Blue for primary metric highlight."

6. **Cross-Section Diagram:** "Illustrate a cross-section view with precise line weights. Include measurement indicators with dimension lines. Navy Blue for structural elements, Engineering Blue for highlighted sections."

### Iteration Guide
1. Start with grid-aligned layout structure before adding content
2. Apply color sparingly — Engineering Blue should be the dominant accent
3. Ensure all lines have consistent stroke weights (1px default, 2px for emphasis)
4. Verify all connection lines are straight or 90-degree angles
5. Add dimension lines and labels last, using caption typography
6. Review for decorative elements — remove anything that doesn't communicate information
7. Check contrast ratios: Deep Slate on Blueprint Paper should be >= 4.5:1
