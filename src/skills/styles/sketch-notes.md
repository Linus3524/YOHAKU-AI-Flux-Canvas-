# Sketch Notes Design System

Soft hand-drawn illustration style with fresh, refined minimalist editorial aesthetic.

---

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Warm, approachable, intelligent, creative
- **Emotional Tone:** Friendly, inviting, intellectually curious, playful
- **Key Characteristics:**
  - Illustration or hand-drawn feel with soft, relaxed brush strokes
  - Fresh, refined overall style with minimalist editorial approach
  - Emphasis on precision, clarity, and intelligent elegance
  - Prioritizes warmth, approachability, and friendliness over cold perfection
  - Balances artistic expression with clear information hierarchy

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Deep Charcoal | #2C3E50 | Headlines, primary text |
| **Secondary** | Deep Brown | #4A4A4A | Secondary text elements |
| **Interactive** | Soft Orange | #F4A261 | Links, interactive highlights |
| **Neutral** | Warm Off-White | #FAF8F0 | Primary background |
| **Surface** | Warm Off-White | #FAF8F0 | Background with subtle paper grain |
| **Accent 1** | Soft Orange | #F4A261 | Highlights, emphasis, energy |
| **Accent 2** | Mustard Yellow | #E9C46A | Secondary highlights, warmth |
| **Accent 3** | Sage Green | #87A96B | Nature, growth concepts |
| **Accent 4** | Light Blue | #7EC8E3 | Tech, AI elements, calm |
| **Accent 5** | Red Brown | #A0522D | Land, infrastructure, earth |
| **Semantic** | — | — | Use accent colors contextually rather than standard semantic colors |

---

## 3. Typography Rules

**Font Families:**
- **Headlines:** Bold hand-written marker font or cartoon poster font (e.g., "Permanent Marker", "Caveat Bold", or similar)
- **Body:** Clear handwritten round or hard-pen style (e.g., "Patrick Hand", "Comic Neue", or similar)

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| H1 (Title) | Marker / Hand | 52px | Bold | 1.2 | 0.01em | Thick strokes with soft edges, slightly uneven baseline |
| H2 (Section) | Marker / Hand | 36px | Bold | 1.3 | 0 | Render as hand-drawn letters |
| H3 (Subsection) | Marker / Hand | 26px | Semi-Bold | 1.4 | 0 | Organic feel, not typed text |
| Body | Handwriting | 18px | Regular | 1.6 | 0.01em | Casual handwriting, legible but not mechanical |
| Caption | Handwriting | 14px | Regular | 1.5 | 0.02em | Everyday notes style |
| Annotation | Handwriting | 13px | Regular | 1.4 | 0 | Small notes, arrows, labels |

**Principles:**
- Headlines render as hand-drawn letters, not typed text
- Slightly uneven baseline for organic feel
- Thick strokes with soft edges on headlines
- Body text mimics everyday notes — consistent but with natural variation
- All typography maintains hand-drawn quality throughout

---

## 4. Component Stylings

### Buttons
- **Primary:** Hand-drawn rectangular shape with Soft Orange (#F4A261) fill, Deep Charcoal text
- **Secondary:** Hand-drawn outline button with Deep Charcoal border, transparent fill
- **Ghost:** Deep Charcoal text with hand-drawn underline, no border
- All buttons have slightly irregular, sketchy borders — not perfect rectangles

### Cards & Containers
- Hand-drawn rectangular outlines with rounded, organic corners
- No perfect geometric shapes — slight variation in line quality
- Color fills don't need to completely fill outlines — preserve hand-painted casual feel
- Subtle paper texture visible through light fills

### Inputs & Forms
- Hand-drawn rectangular borders with sketchy quality
- Deep Charcoal text
- Focus state: Soft Orange underline or border highlight
- Placeholder text in lighter hand-drawn style

### Navigation
- Hand-drawn list with sketchy bullet points or small icons
- Active item: highlighted with Soft Orange or Mustard Yellow
- Connection lines between related items

### Image Treatment
- Conceptual abstract icons illustrating ideas rather than literal scenes
- All visuals have hand-drawn, sketchy quality
- No photographs — everything is illustrated
- Simple geometric shapes with rounded, organic corners

### Distinctive Components
- **Connection Lines:** Hand-drawn wavy feel, not perfectly straight
- **Arrows and Pointers:** Sketchy, informal style with slight curves
- **Doodle Decorations:** Stars, spirals, underlines, circles — scattered thoughtfully
- **Abstract Icons:** Conceptual representations rather than literal imagery
- **Layered Elements:** Subtle overlaps between components for depth

---

## 5. Layout Principles

### Spacing System
- Base unit: 8px (applied with slight organic variation)
- Margins: 12-15% on all sides
- Gap between elements: 20px (small), 32px (medium), 48px (large)
- Informal, non-rigid spacing

### Grid & Container
- No strict grid — layouts feel naturally sketched
- Elements positioned with intentional but informal alignment
- Containers have hand-drawn borders with organic corner rounding
- Layered elements with subtle overlaps

### Whitespace Philosophy
- Open and well-structured layouts
- Whitespace supports readability and hierarchy
- Empty space feels like breathing room on a notebook page
- Avoid overcrowding — sketch notes should feel spacious

### Border Radius Scale
- Organic rounding — never perfectly circular corners
- Hand-drawn borders have natural variation
- Rounded corners preferred but imperfectly executed

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 (Flat) | Hand-drawn border only | Default elements |
| 1 (Layered) | Slight overlap with adjacent element | Related items grouped together |
| 2 (Highlighted) | Soft colored fill behind element | Emphasized sections |

**Shadow Philosophy:** Sketch notes style does not use digital shadows. Depth is created through layering (overlapping elements), hand-drawn borders, and color fills. The aesthetic is intentionally flat and two-dimensional like a notebook page. When emphasis is needed, use a soft colored wash or highlight behind the element rather than a drop shadow.

---

## 7. Do's and Don'ts

### Do
- Keep layouts open and well-structured
- Emphasize information hierarchy and readability
- Use hand-drawn quality for all elements
- Allow imperfection — slight wobbles add character
- Layer elements with subtle overlaps
- Use connection lines with organic, wavy feel
- Include thoughtful doodle decorations
- Preserve the casual, note-taking aesthetic

### Don't
- Use perfect geometric shapes or perfectly straight lines
- Create photorealistic elements
- Overcrowd with too many elements
- Use pure white backgrounds — stick to warm off-white
- Apply digital shadows or elevation effects
- Use typed-looking fonts — everything should feel hand-drawn
- Add slide numbers, footers, or logos
- Create dense, cramped layouts

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >= 1280px | Full sketch layouts, multiple content sections with connections |
| Tablet | 768px - 1279px | Simplified connections, fewer decorative doodles |
| Mobile | < 768px | Single column, larger text, minimal decorative elements |

**Touch Targets:** Minimum 48x48px for interactive elements

**Collapsing Strategy:**
- Side-by-side content stacks vertically
- Connection lines simplify or become vertical
- Decorative doodles reduce in number on smaller screens
- Maintain hand-drawn quality at all sizes

**Image Behavior:**
- Illustrations scale proportionally
- Line weights may appear thicker at smaller sizes
- Text remains legible — prioritize readability

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: #FAF8F0 (Warm Off-White)
- Primary Text: #2C3E50 (Deep Charcoal)
- Secondary Text: #4A4A4A (Deep Brown)
- Accent 1: #F4A261 (Soft Orange)
- Accent 2: #E9C46A (Mustard Yellow)
- Accent 3: #87A96B (Sage Green)
- Accent 4: #7EC8E3 (Light Blue)
- Accent 5: #A0522D (Red Brown)

### Example Component Prompts

1. **Sketch Title Page:** "Create a title page on warm off-white (#FAF8F0) background with subtle paper grain. Title in bold hand-drawn marker style (Deep Charcoal #2C3E50) with slightly uneven baseline. Add a small hand-drawn star doodle in Soft Orange (#F4A261) and a sketchy underline beneath the title."

2. **Concept Map:** "Design a concept map with hand-drawn rounded rectangles connected by wavy sketchy lines. Each concept box has a different soft accent fill (Mustard Yellow, Sage Green, Light Blue) that doesn't fully fill the outline. Labels in handwriting style. Connection lines have slight organic curves, not straight."

3. **Annotated Diagram:** "Create an annotated diagram with a central illustration surrounded by hand-drawn callout lines pointing to key features. Callout text in casual handwriting. Arrows are sketchy and informal. Use Soft Orange (#F4A261) for emphasis arrows. Background: warm off-white with subtle texture."

4. **Step Process with Doodles:** "Illustrate a 4-step process with hand-drawn numbered circles (Mustard Yellow fill, Deep Charcoal numbers). Steps connected by sketchy arrows. Each step has a short handwritten description. Add small decorative doodles: a star near step 1, a spiral near the final step."

5. **Highlighted Quote Box:** "Design a quote box with a hand-drawn rectangular border in Deep Charcoal. The quote text in bold marker style. A Soft Orange (#F4A261) highlighter-style wash behind key words. Small doodle underlines beneath emphasized phrases."

6. **Comparison Sketch:** "Create a two-column comparison with hand-drawn headers and sketchy dividing line. Each column has bullet points represented by small hand-drawn dots or checkmarks. Use Sage Green (#87A96B) checkmarks for positive items. Connection lines link related points across columns."

### Iteration Guide
1. Start with warm off-white background and add subtle paper grain texture
2. Add content in hand-drawn typography with organic variation
3. Create layout structure with hand-drawn containers and organic corners
4. Add connection lines with wavy, sketchy quality (not straight)
5. Apply soft accent colors as fills that don't fully cover outlines
6. Layer elements with subtle overlaps for depth
7. Add thoughtful doodle decorations (stars, spirals, underlines) sparingly
8. Review for perfection — introduce slight wobble and imperfection throughout
