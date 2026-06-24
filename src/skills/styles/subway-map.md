# Subway Map Design System

Transit diagram style with colored lines, station markers, and schematic route visualization.

---

## 1. Visual Theme & Atmosphere

**Brand Personality:**
- Systematic and navigational
- Clean, efficient, and organized
- Information-dense yet readable
- Urban and cosmopolitan

**Emotional Description:**
The Subway Map style evokes the clarity and confidence of navigating a complex transit system. Like Harry Beck's iconic London Underground map, it transforms complexity into simplicity through schematic representation. It feels purposeful, democratic, and universally understandable—anyone can follow the colored lines to their destination.

**Key Characteristics:**
- Colored route lines in bold, distinct hues
- Strict 45-degree and 90-degree angles only
- Station markers as circles or dots
- Interchange symbols where lines connect
- Simplified, non-geographic layout
- Line thickness hierarchy (main lines thicker)
- Clean, horizontal or angled text labels
- White or light background for maximum contrast

---

## 2. Color Palette & Roles

**Transit Line Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Line Red | Transit red | `#E31837` | Primary route line |
| Line Blue | Transit blue | `#0039A6` | Secondary route line |
| Line Green | Transit green | `#009B3A` | Tertiary route line |
| Line Yellow | Transit yellow | `#FCCC0A` | Quaternary route line |
| Line Orange | Transit orange | `#FF6319` | Fifth route line |
| Line Purple | Transit purple | `#B933AD` | Sixth route line |
| Line Teal | Transit teal | `#00A1DE` | Seventh route line |
| Line Brown | Transit brown | `#996633` | Eighth route line |

**Background Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Pure White | White | `#FFFFFF` | Primary map background |
| Light Gray | Soft gray | `#F5F5F5` | Secondary background, water areas |
| Off White | Warm white | `#FAFAFA` | Panel backgrounds |

**Station & Marker Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Station Fill | White | `#FFFFFF` | Station circle interior |
| Station Border | Dark gray | `#333333` | Station circle outline |
| Interchange Fill | White | `#FFFFFF` | Interchange marker interior |
| Terminus | Dark gray | `#333333` | End-of-line station fill |
| Current Location | Bright blue | `#0078D4` | "You are here" marker |

**Text & Label Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary Text | Near black | `#1A1A1A` | Station names, main labels |
| Secondary Text | Dark gray | `#4A4A4A` | Secondary labels, annotations |
| Line Badge Text | White | `#FFFFFF` | Text on colored line badges |
| Water Label | Medium blue | `#5B9BD5` | Water body labels |

**Semantic Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Water | Light blue | `#E3F2FD` | Water bodies, rivers |
| Park | Light green | `#E8F5E9` | Parks, green spaces |
| Zone Border | Dashed gray | `#9E9E9E` | Fare zone boundaries |
| Construction | Orange hatch | `#FF9800` | Under construction segments |

---

## 3. Typography Rules

**Font Family:**
- Primary: Clean, highly legible sans-serif (e.g., "Helvetica Neue", "Arial", "Roboto", "Inter")
- Secondary: System sans-serif for UI elements
- No decorative or stylized fonts—legibility is paramount

**Hierarchy Table:**

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Map Title | Sans-serif | 24-32px | 700 | 1.2 | 0em | Bold, clear identification |
| Station Name | Sans-serif | 11-13px | 500 | 1.2 | 0.02em | Small but readable |
| Line Name | Sans-serif | 14-16px | 600 | 1.3 | 0.01em | Route identification |
| Legend Label | Sans-serif | 12px | 400 | 1.4 | 0em | Legend item text |
| Annotation | Sans-serif | 10-11px | 400 | 1.3 | 0em | Small notes, distances |
| Badge Text | Sans-serif | 11-12px | 700 | 1.0 | 0.03em | Line number in circle/badge |
| Zone Label | Sans-serif | 10px | 400 (Italic) | 1.2 | 0.05em | Fare zone indicators |

**Typography Principles:**
- Station names are small but must remain perfectly legible
- Use horizontal text where possible; angled only when necessary
- Bold weight for line names and important labels
- Consistent text alignment relative to stations
- Avoid overlapping text with lines or other labels

---

## 4. Component Stylings

### Buttons
- **Primary:** Colored line fill, white text, circular or pill shape
- **Secondary:** White fill, colored border, colored text
- **Line Selector:** Circle with line color, white number/letter inside
- **Zoom Button:** Square with +/- symbols, light border

### Cards & Containers
- **Station Info Card:** White bg, 1px light border, rounded corners, station name + connections
- **Legend Panel:** White bg, grouped by line color with sample line segment
- **Route Panel:** Shows selected route with transfer points highlighted

### Inputs & Forms
- **Search:** Rounded input with station icon, autocomplete dropdown
- **Line Filter:** Checkbox list with colored line indicators
- **Date/Time Selector:** For schedule information

### Navigation
- **Line Tabs:** Horizontal tabs with colored underline matching line color
- **Zoom Controls:** +/- buttons with slider
- **Layer Toggle:** Checkboxes for lines, zones, accessibility

### Image Treatment
- Map is the primary visual—no decorative images
- Station photos may appear in info cards (small, square)
- Icons for accessibility, elevators, parking (simple, monochrome)

### Distinctive Components
- **Route Line:** Thick colored line (4-6px), 45/90-degree angles only
- **Station Marker:** Circle (8-12px diameter), white fill, dark border
- **Interchange Station:** Larger circle or connected circles where lines meet
- **Line Badge:** Circle or rectangle with line color and number/letter
- **Terminus Marker:** Station marker with line ending cap
- **Current Location:** Pulsing blue dot with "You are here" label
- **Route Highlight:** Brightened/thickened line showing selected path
- **Zone Boundary:** Dashed gray line with zone number label

---

## 5. Layout Principles

**Spacing System:**
- Base unit: 4px
- Line spacing: 20-24px between parallel lines
- Station spacing: Minimum 40px along line direction
- Label offset: 8-12px from station marker
- Map padding: 24px from edges

**Grid & Container:**
- Implicit grid based on line spacing (approx 20-24px)
- Lines follow 45-degree and 90-degree angles exclusively
- Stations align to grid intersections
- Map container: full width with minimum 320px height
- Legend positioned in corner, not overlapping map

**Whitespace Philosophy:**
- White space is the canvas—the map lives on it
- Lines need breathing room to be distinguishable
- Clustered areas may need simplified representation
- Water and park areas provide visual rest

**Border Radius Scale:**
- Sharp: 0px (for line segments, grid elements)
- Small: 4px (for station markers, small badges)
- Medium: 8px (for info cards, panels)
- Full: 50% (for circular station markers, line badges)

---

## 6. Depth & Elevation

**Elevation Table:**

| Level | Treatment | Use |
|-------|-----------|-----|
| Base Map | Flat, no shadow | Background, water, parks |
| Route Lines | Slightly above base | Colored transit lines |
| Stations | Small white circle on top | Station markers |
| Labels | Above all | Text labels |
| Overlays | Light shadow + higher z-index | Info cards, tooltips, modals |

**Shadow Philosophy:**
Subway maps are fundamentally flat diagrams. Shadows are used sparingly and only for overlay UI elements (info cards, tooltips) to separate them from the map. The map itself should have no shadows—depth is conveyed through layering (lines above background, stations above lines, labels above all).

---

## 7. Do's and Don'ts

### Do's
- Use bold, distinct colors for each line
- Keep angles strictly at 45 and 90 degrees
- Use consistent line thickness within each route
- Make station markers clearly visible
- Label stations with horizontal text when possible
- Simplify geography—straighten curved routes
- Use white space between parallel lines
- Include a clear legend
- Show interchange connections clearly
- Use accessible color combinations

### Don'ts
- Don't use curved or freehand lines
- Don't overlap line labels or station names
- Don't use similar colors for adjacent lines
- Don't show geographic accuracy—schematic is key
- Don't use gradients on route lines
- Don't make station markers too small
- Don't clutter the map with too many annotations
- Don't use decorative fonts
- Don't add unnecessary visual effects
- Don't forget accessibility (colorblind-friendly patterns)

---

## 8. Responsive Behavior

**Breakpoints:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Single line view, vertical scroll, simplified |
| Tablet | 640-1024px | Partial map view, swipe to pan |
| Desktop | > 1024px | Full map view, all lines visible |

**Touch Targets:**
- Station markers: minimum 24x24px touch area
- Line selector buttons: 44x44px minimum
- Zoom controls: 40x40px minimum

**Collapsing Strategy:**
- On mobile, show selected line only with option to switch
- Legend becomes collapsible panel
- Station info appears as bottom sheet on mobile
- Map becomes pannable/zoomable on smaller screens

**Image Behavior:**
- Map scales proportionally
- Labels remain readable at all zoom levels
- Line thickness adjusts with zoom
- Station markers scale with zoom level

---

## 9. Agent Prompt Guide

### Quick Color Reference
- Line colors: `#E31837` (red), `#0039A6` (blue), `#009B3A` (green), `#FCCC0A` (yellow), `#FF6319` (orange), `#B933AD` (purple), `#00A1DE` (teal), `#996633` (brown)
- Background: `#FFFFFF` (white), `#F5F5F5` (light gray)
- Stations: `#FFFFFF` fill, `#333333` border
- Text: `#1A1A1A` (primary), `#4A4A4A` (secondary)
- Water: `#E3F2FD`, Parks: `#E8F5E9`
- Angles: 45 and 90 degrees only

### Example Component Prompts

1. **Subway Map Overview:** "Create a transit map with 4 colored lines (red `#E31837`, blue `#0039A6`, green `#009B3A`, yellow `#FCCC0A`) on white background. Lines at 45 and 90 degree angles only. 12 station markers as white circles with `#333333` borders. 2 interchange stations where lines cross. Station names in 12px sans-serif. Include a legend panel in top-right."

2. **Route Planner Panel:** "Design a route planning interface with a subway map. Left side: map with highlighted route in bright blue `#0078D4`. Right side: route panel showing start station, end station, 2 transfer points, and total time. Panel has white bg, 1px light border, 8px radius."

3. **Station Info Card:** "Create a station information card that appears on hover/click. White background, 8px radius, 1px `#E5E5E5` border. Shows: station name (16px bold), list of connecting lines (colored badges), accessibility icons, and nearby attractions. Small, compact design."

4. **Line Status Display:** "Design a line status dashboard showing 6 transit lines. Each row: colored line badge (circle with line color and number), line name, status indicator (green dot for normal, orange for delay, red for closed), and delay text if applicable. Clean list layout on white bg."

5. **Subway Map Legend:** "Create a map legend component with 8 line entries. Each entry: 24px colored line segment + line name in 13px sans-serif. Grouped by line type (metro, regional, express). White background, compact vertical list."

6. **Interactive Station Selector:** "Design a station selector dropdown for a subway app. Input field with search icon. Dropdown shows: recent stations, nearby stations, and alphabetical list. Each item has a small station marker icon. Clean white design with subtle borders."

7. **Network Diagram:** "Create a process flow diagram in subway map style. 5 'stations' as process steps connected by colored lines. Each station: circle marker + step name + brief description. Lines connect in schematic layout with 90-degree angles. Use `#0039A6` blue for main flow, `#E31837` red for alternate path."

### Iteration Guide
1. Define the lines and their colors (maximum 8, ensure distinctness)
2. Plan the schematic layout with 45/90-degree angles
3. Place station markers at key intersections and endpoints
4. Add station labels with consistent positioning
5. Include interchange markers where lines connect
6. Add background elements (water, parks) if needed
7. Create legend panel with line identification
8. Add any overlay UI (route highlighting, info cards)
9. Final check: verify all angles, label readability, color contrast
