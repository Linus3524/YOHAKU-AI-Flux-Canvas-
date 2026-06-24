# Notion Design System

SaaS dashboard aesthetic with clean data focus and productivity tool styling.

---

## 1. Visual Theme & Atmosphere

- **Brand Personality:** Functional, organized, professional, trustworthy
- **Emotional Tone:** Focused, productive, clear, reliable
- **Key Characteristics:**
  - Clean, functional SaaS interface aesthetic
  - Dashboard-inspired layouts with clear data hierarchy
  ²  - Notion, Linear, and modern productivity tool styling
  - Information-dense but organized
  - Professional and trustworthy appearance

---

## 2. Color Palette & Roles

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Notion Blue | #2383E2 | Links, primary actions, active states |
| **Secondary** | — | — | No secondary accent — functional minimalism |
| **Interactive** | Notion Blue | #2383E2 | Buttons, links, toggles, interactive elements |
| **Neutral** | Near Black | #1F1F1F | Headlines, body text |
| **Neutral Light** | Gray | #6B6B6B | Metadata, labels, secondary text |
| **Surface** | Light Gray | #F7F7F5 | Primary background |
| **Surface Alt** | Pure White | #FFFFFF | Content cards, elevated surfaces |
| **Border** | Light Border | #E5E5E5 | Card borders, dividers, separators |
| **Semantic Success** | Success Green | #0F7B6C | Positive metrics, success states |
| **Semantic Alert** | Alert Red | #E03E3E | Negative metrics, errors, alerts |
| **Semantic Warning** | Warning Yellow | #DFAB01 | Cautions, warnings |

---

## 3. Typography Rules

**Font Families:**
- **All Text:** System UI stack (ui-sans-serif, system-ui, -apple-system) or Inter

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| H1 (Page Title) | System/Inter | 40px | Semi-Bold (600) | 1.2 | -0.02em | Clean, functional letterforms |
| H2 (Section) | System/Inter | 28px | Semi-Bold (600) | 1.3 | -0.01em | Slightly tighter letter-spacing |
| H3 (Subsection) | System/Inter | 22px | Medium (500) | 1.4 | 0 | Clear hierarchy indicator |
| Body | System/Inter | 16px | Regular (400) | 1.6 | 0 | Optimized for screen reading |
| Caption / Label | System/Inter | 14px | Regular (400) | 1.5 | 0.01em | Metadata, small labels |
| Code / Data | Mono | 14px | Regular (400) | 1.5 | 0 | Monospace for code, data |
| Small | System/Inter | 12px | Regular (400) | 1.4 | 0.01em | Timestamps, fine print |

**Principles:**
- Semi-bold weight for emphasis — not heavy bold
- Slightly tighter letter-spacing for headlines
- Comfortable line height (1.6) for extended reading
- Same font family throughout for consistency
- Monospace for code, data, and technical content

---

## 4. Component Stylings

### Buttons
- **Primary:** Notion Blue (#2383E2) background, white text, 4px border-radius, no border
- **Secondary:** White background, Near Black text, 1px solid Light Border (#E5E5E5), 4px border-radius
- **Ghost:** Transparent background, Near Black text, no border — hover shows Light Gray background
- **Danger:** Alert Red (#E03E3E) background, white text

### Cards & Containers
- Pure White (#FFFFFF) background on Light Gray (#F7F7F5) page background
- 1px solid Light Border (#E5E5E5) or subtle shadow
- 4px border-radius
- Clean, flat appearance

### Inputs & Forms
- White background
- 1px solid Light Border (#E5E5E5)
- 4px border-radius
- Near Black text
- Focus state: Notion Blue border or subtle blue glow

### Navigation
- Sidebar navigation with hover highlights (Light Gray background)
- Active item: Notion Blue text or left border accent
- Collapsible sections with chevron indicators
- Breadcrumb navigation for hierarchy

### Image Treatment
- Functional images (screenshots, diagrams)
- 4px border-radius
- Optional subtle border
- No decorative or artistic image treatment

### Distinctive Components
- **Card-Based Layouts:** Content organized in bordered cards
- **Data Tables:** Clean, minimal tables with Light Border dividers
- **Progress Bars:** Track in Light Gray, fill in Notion Blue or Success Green
- **Metric Displays:** Large numbers with descriptive labels
- **Icon Navigation:** Small icon-based navigation hints
- **Checkbox / Toggle:** Custom-styled checkboxes and toggles
- **Tag Chips:** Small rounded labels with Light Gray background
- **Breadcrumb Indicators:** Hierarchy path with separator chevrons

---

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Margins: 10-12% on all sides
- Gap between elements: 8px (tight), 16px (standard), 24px (loose)
- Section spacing: 32px minimum

### Grid & Container
- Clean grid alignment
- Card-based content organization
- Sidebar + main content layout common
- Containers align to consistent grid

### Whitespace Philosophy
- Functional whitespace — serves organization, not decoration
- Information-dense but not cluttered
- Whitespace separates functional groups
- Every pixel serves a purpose

### Border Radius Scale
- Small: 4px (buttons, inputs, tags, small cards)
- Medium: 8px (cards, containers, modals)
- Large: 0px (full-width sections, tables)

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 (Flat) | 1px solid Light Border | Default cards, static content |
| 1 (Subtle) | 0 1px 2px rgba(0,0,0,0.06) | Slightly elevated cards |
| 2 (Raised) | 0 4px 8px rgba(0,0,0,0.08) | Dropdowns, popovers, floating panels |
| 3 (Modal) | 0 8px 16px rgba(0,0,0,0.1) | Modals, dialogs, overlays |

**Shadow Philosophy:** Shadows are minimal and functional. The Notion aesthetic avoids decorative depth — elevation exists only to indicate functional layering (dropdowns above content, modals above pages). Shadows are soft, short, and neutral. The primary visual hierarchy comes from typography, spacing, and borders, not from depth effects.

---

## 7. Do's and Don'ts

### Do
- Use card-based content organization
- Create clear data hierarchy
- Use subtle shadows and borders
- Keep layouts grid-aligned
- Present metrics prominently
- Use functional iconography
- Maintain consistent spacing
- Use Notion Blue sparingly for actions and links

### Don't
- Use decorative illustrations or artistic elements
- Add gradients or complex backgrounds
- Create artistic or expressive layouts
- Use rounded blob shapes or organic forms
- Apply heavy shadows or glow effects
- Use more than one accent color for actions
- Add slide numbers, footers, or logos (for presentations)
- Create cluttered, unorganized information density

---

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >= 1280px | Full sidebar + main content, multi-column cards |
| Tablet | 768px - 1279px | Collapsed sidebar, reduced columns |
| Mobile | < 768px | Single column, hidden sidebar (hamburger), stacked cards |

**Touch Targets:** Minimum 44x44px for interactive elements

**Collapsing Strategy:**
- Sidebar collapses to icons or hides on mobile
- Multi-column card grids reduce to 2 then 1 column
- Data tables may scroll horizontally or stack
- Navigation collapses to bottom bar or hamburger menu

**Image Behavior:**
- Functional images scale within containers
- Screenshots maintain readability at all sizes
- Diagrams may simplify on smaller screens

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: #F7F7F5 (Light Gray)
- Card Background: #FFFFFF (Pure White)
- Primary Text: #1F1F1F (Near Black)
- Secondary Text: #6B6B6B (Gray)
- Border: #E5E5E5 (Light Border)
- Primary Action: #2383E2 (Notion Blue)
- Success: #0F7B6C (Success Green)
- Error: #E03E3E (Alert Red)
- Warning: #DFAB01 (Warning Yellow)

### Example Component Prompts

1. **Dashboard Overview:** "Create a dashboard overview page with Light Gray (#F7F7F5) background. White cards with 1px Light Border (#E5E5E5) and 4px radius. Top metric cards showing 4 key numbers in large semi-bold Near Black (#1F1F1F). Labels in Gray (#6B6B6B) below each number. Cards in a 4-column grid."

2. **Task List:** "Design a task list with white background. Each task row has a custom checkbox (empty square, checked shows Notion Blue #2383E2 fill with white checkmark). Task title in Near Black. Due date in Gray. Hover state: Light Gray (#F7F7F5) background. 1px border between rows."

3. **Data Table:** "Create a clean data table with white background. Header row with Near Black semi-bold text and Light Gray (#F7F7F5) background. Data rows with 1px Light Border separators. Status column uses colored dots: Success Green (#0F7B6C), Alert Red (#E03E3E), Warning Yellow (#DFAB01). No vertical borders."

4. **Feature Walkthrough Card:** "Design a feature card with white background, 1px Light Border, 4px radius. Icon at top in Notion Blue (#2383E2). Title in semi-bold Near Black. Description in Gray. A 'Learn more' link in Notion Blue at bottom. Clean, functional, no decoration."

5. **Progress Dashboard:** "Create a progress tracking section with a large progress bar. Track: Light Gray (#E5E5E5), Fill: Notion Blue (#2383E2). Percentage label in large semi-bold to the right. Below: a list of milestones with checkboxes. Completed milestones show Success Green checkmarks."

6. **Settings Panel:** "Design a settings panel with Light Gray background. White setting cards with 1px border. Each setting has a label in semi-bold Near Black, description in Gray, and a toggle switch on the right. Toggle: Light Gray track, white thumb, Notion Blue when active. Clean vertical stack with 16px gaps."

### Iteration Guide
1. Start with Light Gray (#F7F7F5) page background
2. Add white cards with 1px Light Border (#E5E5E5) for content containers
3. Apply System/Inter typography with clear hierarchy (semi-bold for headers)
4. Use Notion Blue (#2383E2) only for interactive elements and links
5. Add functional components (tables, progress bars, checkboxes)
6. Use semantic colors (Green, Red, Yellow) only for status indicators
7. Ensure grid alignment and consistent spacing throughout
8. Review for decoration — remove anything that doesn't serve a functional purpose
