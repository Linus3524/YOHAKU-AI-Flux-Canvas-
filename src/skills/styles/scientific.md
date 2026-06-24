# Scientific Design System

Educational scientific illustration style for pathways, processes, and technical diagrams.

---

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Precise, educational, authoritative, and clinically clear
- **Emotional Description:** Academic scientific illustration aesthetic for biological pathways, chemical processes, and technical systems
- **Key Characteristics:**
  - Clean, precise diagrams with proper labeling
  - Clear visual flow and directional arrows
  - Educational clarity with professional polish
  - Textbook quality illustrations and academic journal figures
  - Proper chemical/molecular notation
  - Numbered step sequences for processes

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Off-White | #FAFAFA | Primary background |
| **Secondary** | Light Blue-Gray | #F0F4F8 | Secondary backgrounds, figure panels |
| **Primary Text** | Dark Slate | #1E293B | Headlines, body text |
| **Secondary Text** | Medium Gray | #475569 | Annotations, captions |
| **Pathway 1** | Teal | #0D9488 | Primary pathway, main process |
| **Pathway 2** | Blue | #3B82F6 | Secondary pathway |
| **Pathway 3** | Purple | #8B5CF6 | Tertiary pathway |
| **Membrane** | Amber | #F59E0B | Biological membranes, barriers |
| **Alert** | Red | #EF4444 | Key molecules, emphasis, danger |
| **Positive** | Green | #22C55E | Products, outputs, success |
| **Neutral** | Gray | #94A3B8 | Inactive elements, references |

**Color Philosophy:** Colors have semantic meaning tied to scientific conventions. Teal/blue for pathways, amber for membranes, red for emphasis/danger, green for products. Neutral background keeps focus on the science.

---

## 3. Typography Rules

**Font Family:**
- **Headlines:** Clean serif (Times New Roman, Georgia) for formal academic feel
- **Labels:** Sans-serif (Inter, Arial) for diagram labels and annotations
- **Body:** Serif for paragraphs, sans-serif for bullet points and lists

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Figure Title | Serif | 24-32px | 700 | 1.2 | 0 | "Figure 1:" format |
| Section Head | Serif | 20-24px | 700 | 1.3 | 0 | Bold, formal |
| Subhead | Sans-serif | 16-18px | 600 | 1.3 | 0 | Clear hierarchy |
| Body | Serif | 14-16px | 400 | 1.6 | 0 | Academic publication styling |
| Label | Sans-serif | 11-13px | 500 | 1.2 | 0.01em | Diagram annotations |
| Caption | Sans-serif | 12px | 400 | 1.4 | 0 | Figure captions |
| Chemical | Monospace | 12-14px | 400 | 1.2 | 0 | Chemical formulas |

**Principles:**
- Serif for headlines adds academic authority
- Sans-serif for labels ensures clarity at small sizes
- Monospace for chemical formulas
- Academic publication styling throughout
- Consistent sizing for hierarchy

---

## 4. Component Stylings

### Buttons
- **Primary:** Teal (#0D9488) background, white text, 4px border-radius, clean sans-serif
- **Secondary:** White background, 1px Dark Slate border, dark text, 4px border-radius
- **Danger:** Red (#EF4444) background, white text, 4px border-radius

### Cards & Containers
- Off-White (#FAFAFA) or Light Blue-Gray (#F0F4F8) background
- 1px light gray border (#E2E8F0)
- 4-8px border-radius
- Padding 20-24px
- Figure number label at top

### Inputs & Forms
- White background
- 1px #CBD5E1 border
- 4px border-radius
- Focus: Teal border
- Labels: Sans-serif, 13px, medium weight

### Navigation
- Clean top bar, white background
- Serif for section titles, sans-serif for nav items
- Active: Teal underline

### Image Treatment
- Horizontal membrane or structure bases
- Labeled modular components with distinct colors
- Flow arrows (electron, proton, molecule movement)
- Cross-section and pathway diagrams
- Precise, consistent line weights

### Distinctive Components
- **Pathway Diagram:** Connected nodes with directional arrows, color-coded by type
- **Membrane Structure:** Horizontal base with embedded components
- **Molecular Callout:** Circle or box highlighting key molecule with label
- **Process Step:** Numbered sequence with input → process → output
- **Summary Box:** Bordered container with key findings
- **Chemical Formula:** Monospace text with proper subscripts

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 4px (precise, scientific)
- Section padding: 32-48px vertical
- Content max-width: 1000px centered
- Tight, organized spacing

**Grid & Container:**
- Structured, logical flow layouts
- Left-to-right, top-to-bottom reading order
- Figure panels with clear boundaries
- Process flows with directional hierarchy

**Whitespace Philosophy:**
- Clean, clinical whitespace
- Organized, not decorative
- Clear separation between figures
- Room for labels and annotations

**Border Radius Scale:**
- Small (labels, buttons): 4px
- Medium (cards, figure panels): 4-8px
- Large (feature containers): 8px
- Sharp, precise edges preferred

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat, white | Base content, diagrams |
| 1 | Subtle border | Figure panels, cards |
| 2 | Light shadow (0 1px 3px rgba(0,0,0,0.06)) | Elevated figures |
| 3 | Medium shadow (0 2px 6px rgba(0,0,0,0.08)) | Floating callouts |

**Shadow Philosophy:** Minimal, functional shadows. Scientific illustrations should feel flat and precise like textbook figures. Use borders and color coding for separation, not shadows.

---

## 7. Do's and Don'ts

### Do
- Use precise, consistent line weights
- Label all components clearly
- Show directional flow with arrows
- Include chemical/molecular notation where relevant
- Create clear numbered sequences
- Use color coding consistently for pathways
- Maintain academic publication quality

### Don't
- Use decorative illustrations
- Create imprecise or artistic diagrams
- Omit important labels
- Use inconsistent visual language
- Add slide numbers, footers, or logos
- Use gradients or glossy effects
- Create cluttered or ambiguous diagrams

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, diagrams simplify, labels reposition |
| Tablet | 640-1024px | 2-column for comparisons, diagrams at 80% scale |
| Desktop | > 1024px | Full layout, diagrams at full detail, side-by-side figures |

**Touch Targets:** Minimum 44px for interactive elements

**Collapsing Strategy:**
- Complex diagrams may need scrollable containers
- Side-by-side figures stack vertically
- Labels may abbreviate on small screens
- Process flows become vertical on mobile

**Image Behavior:**
- Diagrams maintain aspect ratio
- Labels remain readable at all sizes
- Complex figures may need zoom on mobile
- Arrows and flow indicators remain clear

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: #FAFAFA (Off-White) / #F0F4F8 (Light Blue-Gray)
- Primary Text: #1E293B (Dark Slate)
- Pathways: #0D9488 (Teal), #3B82F6 (Blue), #8B5CF6 (Purple)
- Membrane: #F59E0B (Amber)
- Alert: #EF4444 (Red)

### Example Component Prompts

1. **Biological Pathway:** "Off-White (#FAFAFA) background. Horizontal membrane structure in Amber (#F59E0B) across the middle. Embedded protein components labeled in sans-serif (12px). Teal (#0D9488) arrows showing molecule flow. Numbered steps (1-4) with input/output labels."

2. **Chemical Process:** "Light Blue-Gray (#F0F4F8) background. Central reaction diagram with reactants on left, products on right. Chemical formulas in monospace (14px). Red (#EF4444) for catalyst. Green (#22C55E) for products. Arrow showing reaction direction."

3. **Process Flow Diagram:** "White background with 5 numbered steps in horizontal flow. Each step: number circle (Teal #0D9488, white text), title in serif bold (16px), description in sans-serif (13px). Steps connected by thick arrows. Summary box at bottom."

4. **Cellular Cross-Section:** "Circular cell diagram with labeled organelles. Each organelle in distinct color: nucleus in Purple (#8B5CF6), mitochondria in Teal (#0D9488), ribosomes in Blue (#3B82F6). Labels in sans-serif (11px) with leader lines. White background."

5. **Experimental Setup:** "Diagram of lab apparatus with labeled components. Clean lines, consistent 2px stroke. Component labels in sans-serif (12px). Amber (#F59E0B) for heat source, Blue (#3B82F6) for cooling. Figure caption below in 12px italic."

6. **Data Pathway:** "Information flow diagram from source to output. 4 stages: Data Collection (Blue), Processing (Teal), Analysis (Purple), Results (Green). Each stage is a rounded rectangle with icon and label. Arrows between stages. Off-White background."

### Iteration Guide

1. **Define the process:** Identify the pathway, process, or system to illustrate.
2. **Choose color coding:** Assign consistent colors to pathway types or molecule categories.
3. **Draw the structure:** Create the base diagram (membrane, cell, apparatus, etc.).
4. **Add components:** Place and label all key elements with clear leader lines.
5. **Show flow:** Add directional arrows indicating movement or process order.
6. **Number and summarize:** Add step numbers and a summary box with key findings.
