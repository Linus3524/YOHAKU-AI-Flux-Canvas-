# UI Wireframe Design System

Grayscale interface mockup style for product designs, UI explanations, and user flow diagrams.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:**
- Functional and purpose-driven
- Clean, analytical, and systematic
- Design-process oriented
- Professional and communicative

**Emotional Description:**
The UI Wireframe style strips away visual decoration to reveal the underlying structure and logic of an interface. It feels like looking at an architect's blueprint—a purposeful, honest representation of how information and interactions are organized. The grayscale palette and placeholder elements keep the focus on layout, hierarchy, and flow rather than aesthetics.

**Key Characteristics:**
- Grayscale palette with minimal color accents
- Wireframe boxes and placeholder shapes
- X marks for image placeholders
- Simple line icons and geometric shapes
- Grid-based, structured layouts
- Annotation callouts with redline specifications
- Placeholder "Lorem ipsum" text
- UI label style typography
- Emphasis on spacing and alignment

---

## 2. Color Palette & Roles

**Primary Grays:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Light Gray | Soft gray | `#E5E5E5` | Background fills, inactive areas |
| Medium Gray | Neutral gray | `#9CA3AF` | Secondary elements, borders, placeholders |
| Dark Gray | Charcoal | `#374151` | Primary text, active elements, headers |
| Border Gray | Medium-light | `#D1D5DB` | Dividers, card borders, input borders |

**Background Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Pure White | White | `#FFFFFF` | Primary canvas background |
| Off White | Slight gray | `#F9FAFB` | Secondary backgrounds, panels |
| Light Gray BG | Soft gray | `#F3F4F6` | Section backgrounds, alternate rows |

**Accent Colors (Used Sparingly):**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Interactive Blue | Bright blue | `#3B82F6` | Links, buttons, interactive highlights |
| Emphasis Red | Alert red | `#EF4444` | Error states, redline annotations, warnings |
| Success Green | Green | `#10B981` | Success states, confirmations |
| Warning Yellow | Amber | `#F59E0B` | Warning states, cautions |

**Neutral Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Black | Near black | `#111827` | Primary text, strong emphasis |
| Dark Gray | Charcoal | `#374151` | Body text, labels |
| Medium Gray | Gray | `#6B7280` | Secondary text, placeholders |
| Light Gray | Pale gray | `#D1D5DB` | Disabled text, subtle borders |

---

## 3. Typography Rules

**Font Family:**
- Primary: System sans-serif stack (e.g., -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)
- Monospace: System monospace for code/annotations (e.g., "SF Mono", "Consolas", monospace)
- No decorative or stylized fonts

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Page Title | System Sans | 24-32px | 600 | 1.2 | -0.02em | Clear, professional |
| Section Header | System Sans | 18-20px | 600 | 1.3 | -0.01em | Structural divisions |
| Component Label | System Sans | 14-16px | 500 | 1.4 | 0em | UI element names |
| Body Text | System Sans | 14px | 400 | 1.5 | 0em | Lorem ipsum placeholder |
| Caption | System Sans | 12px | 400 | 1.4 | 0em | Small annotations |
| Annotation | Monospace | 11-12px | 400 | 1.4 | 0em | Redline specs, measurements |
| Placeholder | System Sans | 14px | 400 (Italic) | 1.5 | 0em | "Lorem ipsum" text |

**Typography Principles:**
- Use system fonts for authentic wireframe feel
- Italic for placeholder text to distinguish from real content
- Monospace for measurements and technical annotations
- Consistent sizing—wireframes should feel uniform
- No custom fonts or stylized typography

---

## 4. Component Stylings

### Buttons
- **Primary:** 1px `#374151` border, white fill, dark text, 4px border-radius
- **Secondary:** 1px `#9CA3AF` border, transparent fill, medium gray text
- **Disabled:** 1px `#D1D5DB` border, `#F3F4F6` fill, light gray text
- **CTA (Wireframe):** 1px `#3B82F6` border, light blue fill `#EFF6FF`, blue text

### Cards & Containers
- **Wireframe Card:** 1px `#D1D5DB` border, white fill, 4px radius, no shadow
- **Panel:** 1px `#E5E5E5` border, `#F9FAFB` fill, used for sidebar/modal
- **Placeholder Box:** 1px `#9CA3AF` dashed border, `#F3F4F6` fill, centered "Image" or "Content" label
- **Image Placeholder:** Rectangle with 1px border, large "X" from corner to corner

### Inputs & Forms
- **Text Input:** 1px `#D1D5DB` border, white fill, 4px radius, placeholder text inside
- **Textarea:** Same as input but taller, resize handle indicator
- **Select:** Input style with small dropdown chevron icon
- **Checkbox:** 16x16px square, 2px border, checkmark when selected
- **Radio:** 16x16px circle, 2px border, dot when selected

### Navigation
- **Nav Bar:** Full width, 1px bottom border `#E5E5E5`, white bg, horizontal links
- **Tab Bar:** Horizontal tabs with bottom border indicator on active tab
- **Sidebar:** 240px width, 1px right border, vertical link list
- **Breadcrumb:** Gray text with "/" separators

### Image Treatment
- **Image Placeholder:** Rectangle with "X" cross from corners, "Image" label centered
- **Avatar Placeholder:** Circle with user icon or initials
- **Icon Placeholder:** Small square with simple line icon
- **Gallery Grid:** Equal-sized placeholder boxes in grid layout

### Distinctive Components
- **Redline Annotation:** Thin `#EF4444` red line with measurement label in monospace
- **Annotation Callout:** Small circle with number, connected by line to element
- **Flow Arrow:** Simple line arrow connecting wireframe screens
- **Screen Frame:** Rectangle with device outline (phone/desktop)
- **Grid Overlay:** Faint dotted grid lines for alignment reference
- **Component Label:** Small text label above/beside element identifying component type

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 4px
- Small gap: 8px (2 units)
- Medium gap: 16px (4 units)
- Large gap: 24px (6 units)
- Section gap: 48px (12 units)
- Container padding: 24px

**Grid & Container:**
- 12-column grid with 24px gutters
- Max container width: 1200px
- Alignment is critical—everything must be pixel-perfect
- Use grid lines as visual guides (faint dotted lines)
- Consistent margins and padding throughout

**Whitespace Philosophy:**
- Whitespace is intentional and measured
- Use redline annotations to document spacing
- Every gap should have a purpose
- Avoid arbitrary spacing—use the 4px system

**Border Radius Scale:**
- Sharp: 0px (for structural elements, containers)
- Small: 4px (for buttons, inputs, small cards)
- Medium: 8px (for modals, larger panels)
- No excessive rounding—wireframes are functional

---

## 6. Depth & Elevation

**Elevation Table:**

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow, 1px border | Base wireframe elements |
| Raised | 1px border + subtle bg shift | Cards, grouped content |
| Overlay | 1px border + semi-transparent backdrop | Modals, popovers |
| Floating | 1px border + light shadow | Dropdowns, tooltips |

**Shadow Philosophy:**
Wireframes use minimal shadow. When needed, use a simple, subtle shadow (0 1px 3px rgba(0,0,0,0.1)) to indicate elevation. The primary depth cue is border treatment and background color shifts, not shadows. Avoid heavy or blurred shadows—they distract from the structural purpose of wireframes.

---

## 7. Do's and Don'ts

### Do's
- Use grayscale for 95% of the wireframe
- Add color accents only for interactive states (blue) or annotations (red)
- Include placeholder "X" marks for images
- Use "Lorem ipsum" or descriptive placeholder text
- Add redline annotations for spacing and measurements
- Keep borders thin (1px) and subtle
- Use system fonts exclusively
- Maintain consistent alignment and spacing
- Label components clearly
- Use simple geometric shapes for icons

### Don'ts
- Don't use photographs or realistic images
- Don't use gradients or complex backgrounds
- Don't use decorative fonts or stylized text
- Don't add drop shadows to everything
- Don't use color for decoration—only for meaning
- Don't make borders too thick or prominent
- Don't use rounded corners excessively
- Don't add unnecessary visual decoration
- Don't use real content—use placeholders
- Don't make it look like a finished design

---

## 8. Responsive Behavior

**Breakpoints:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single column, stacked layout, hamburger nav |
| Tablet | 640-1024px | 2-column layout, sidebar collapses |
| Desktop | > 1024px | Full multi-column, all elements visible |

**Touch Targets:**
- Minimum 44x44px for interactive elements
- Buttons maintain at least 40px height
- Input fields at least 44px tall on mobile

**Collapsing Strategy:**
- Sidebar becomes drawer/sheet on mobile
- Multi-column grids stack to single column
- Navigation collapses to hamburger menu
- Tables become horizontal scroll or card list

**Image Behavior:**
- Image placeholders scale proportionally
- Maintain aspect ratio in responsive layouts
- Grid layouts reflow gracefully

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Backgrounds: `#FFFFFF` (white), `#F9FAFB` (off-white), `#F3F4F6` (light gray)
- Borders: `#D1D5DB` (light), `#9CA3AF` (medium), `#374151` (dark)
- Text: `#111827` (primary), `#374151` (body), `#6B7280` (secondary)
- Accents: `#3B82F6` (interactive blue), `#EF4444` (annotation red)
- Border radius: 0-4px max
- Always use system sans-serif fonts

### Example Component Prompts

1. **Wireframe Login Screen:** "Create a mobile login screen wireframe. White background `#FFFFFF`. Centered card with 1px `#D1D5DB` border, 4px radius. Contains: email input, password input, login button (1px `#374151` border, white fill), and 'Forgot Password' link in `#3B82F6` blue. Use 'Lorem ipsum' placeholder text. Add redline annotations showing 16px gaps between elements."

2. **Wireframe Dashboard Layout:** "Design a desktop dashboard wireframe with sidebar (240px, `#F9FAFB` bg, 1px right border) and main content area. Sidebar has 6 nav items with icons. Main area has: header bar, 4 metric cards in a row (each 1px border, placeholder numbers), and a chart placeholder (large rectangle with 'X' and 'Chart' label). All in grayscale with `#3B82F6` accent for active nav item."

3. **Wireframe Product Card Grid:** "Create a 3-column product card grid wireframe. Each card: 1px `#D1D5DB` border, 4px radius, image placeholder (rectangle with 'X'), product name in `#374151`, price in `#111827`, and add-to-cart button. Use 24px gaps between cards. White background."

4. **Wireframe User Flow Diagram:** "Design a 3-screen user flow wireframe connected by arrows. Screen 1: Login form. Screen 2: Dashboard with sidebar. Screen 3: Settings panel. Each screen is a rectangle with device frame outline. Connect with simple line arrows. Add annotation numbers in red circles. Grayscale with red annotations."

5. **Wireframe Modal Dialog:** "Create a modal dialog wireframe with backdrop overlay. Modal: 1px `#D1D5DB` border, white bg, 8px radius. Contains: title 'Confirm Action', body text placeholder, two buttons side by side (Cancel - outlined, Confirm - filled blue `#3B82F6`). Add redline showing 24px padding inside modal."

6. **Wireframe Navigation Bar:** "Design a top navigation bar wireframe. Full width, white bg, 1px `#E5E5E5` bottom border. Left: logo placeholder (40x40 square with 'X'). Center: 5 nav links in `#374151`. Right: search icon placeholder and user avatar placeholder (32px circle). Height: 64px."

7. **Wireframe Form Layout:** "Create a registration form wireframe with 2-column layout. Left column: heading and description. Right column: form with name, email, password, confirm password inputs (all 1px border, 4px radius, 44px height), checkbox for terms, and submit button. Add redline spacing annotations between fields."

### Iteration Guide
1. Start with a white or light gray background
2. Add structural containers with 1px borders
3. Place placeholder content (X marks for images, Lorem ipsum for text)
4. Add interactive elements with subtle blue accent
5. Apply consistent 4px-based spacing
6. Add redline annotations for measurements
7. Review: ensure 95% grayscale, minimal color
8. Verify all text is placeholder or system font
9. Final check: does it look like a blueprint, not a finished design?
