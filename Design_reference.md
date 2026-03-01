# Modern Design Best Practices

## Philosophy

Create unique, memorable experiences while maintaining consistency through modern design principles. Every project should feel distinct yet professional, innovative yet intuitive.

---

## Landing Pages & Marketing Sites

### Hero Sections
**Go beyond static backgrounds:**
- Animated gradients with subtle movement
- Particle systems or geometric shapes floating
- Interactive canvas backgrounds (Three.js, WebGL)
- Video backgrounds with proper fallbacks
- Parallax scrolling effects
- Gradient mesh animations
- Morphing blob animations


### Layout Patterns
**Use modern grid systems:**
- Bento grids (asymmetric card layouts)
- Masonry layouts for varied content
- Feature sections with diagonal cuts or curves
- Overlapping elements with proper z-index
- Split-screen designs with scroll-triggered reveals

**Avoid:** Traditional 3-column equal grids

### Scroll Animations
**Engage users as they scroll:**
- Fade-in and slide-up animations for sections
- Scroll-triggered parallax effects
- Progress indicators for long pages
- Sticky elements that transform on scroll
- Horizontal scroll sections for portfolios
- Text reveal animations (word by word, letter by letter)
- Number counters animating into view

**Avoid:** Static pages with no scroll interaction

### Call-to-Action Areas
**Make CTAs impossible to miss:**
- Gradient buttons with hover effects
- Floating action buttons with micro-interactions
- Animated borders or glowing effects
- Scale/lift on hover
- Interactive elements that respond to mouse position
- Pulsing indicators for primary actions

---

## Dashboard Applications

### Layout Structure
**Always use collapsible side navigation:**
- Sidebar that can collapse to icons only
- Smooth transition animations between states
- Persistent navigation state (remember user preference)
- Mobile: drawer that slides in/out
- Desktop: sidebar with expand/collapse toggle
- Icons visible even when collapsed

**Structure:**
```
/dashboard (layout wrapper with sidebar)
  /dashboard/overview
  /dashboard/analytics
  /dashboard/settings
  /dashboard/users
  /dashboard/projects
```

All dashboard pages should be nested inside the dashboard layout, not separate routes.

### Data Tables
**Modern table design:**
- Sticky headers on scroll
- Row hover states with subtle elevation
- Sortable columns with clear indicators
- Pagination with items-per-page control
- Search/filter with instant feedback
- Selection checkboxes with bulk actions
- Responsive: cards on mobile, table on desktop
- Loading skeletons, not spinners
- Empty states with illustrations or helpful text

**Use modern table libraries:**
- TanStack Table (React Table v8)
- AG Grid for complex data
- Data Grid from MUI (if using MUI)

### Charts & Visualizations
**Use the latest charting libraries:**
- Recharts (for React, simple charts)
- Chart.js v4 (versatile, well-maintained)
- Apache ECharts (advanced, interactive)
- D3.js (custom, complex visualizations)
- Tremor (for dashboards, built on Recharts)

**Chart best practices:**
- Animated transitions when data changes
- Interactive tooltips with detailed info
- Responsive sizing
- Color scheme matching design system
- Legend placement that doesn't obstruct data
- Loading states while fetching data

### Dashboard Cards
**Metric cards should stand out:**
- Gradient backgrounds or colored accents
- Trend indicators (↑ ↓ with color coding)
- Sparkline charts for historical data
- Hover effects revealing more detail
- Icon representing the metric
- Comparison to previous period

---

## Color & Visual Design

### Color Palettes
**Create depth with gradients:**
- Primary gradient (not just solid primary color)
- Subtle background gradients
- Gradient text for headings
- Gradient borders on cards
- Elevated surfaces for depth

**Color usage:**
- 60-30-10 rule (dominant, secondary, accent)
- Consistent semantic colors (success, warning, error)
- Accessible contrast ratios (WCAG AA minimum)

### Typography
**Create hierarchy through contrast:**
- Large, bold headings (48-72px for heroes)
- Clear size differences between levels
- Variable font weights (300, 400, 600, 700)
- Letter spacing for small caps
- Line height 1.5-1.7 for body text
- Inter, Poppins, or DM Sans for modern feel

### Shadows & Depth
**Layer UI elements:**
- Multi-layer shadows for realistic depth
- Colored shadows matching element color
- Elevated states on hover
- Neumorphism for special elements (sparingly)

---

## Interactions & Micro-animations

### Button Interactions
**Every button should react:**
- Scale slightly on hover (1.02-1.05)
- Lift with shadow on hover
- Ripple effect on click
- Loading state with spinner or progress
- Disabled state clearly visible
- Success state with checkmark animation

### Card Interactions
**Make cards feel alive:**
- Lift on hover with increased shadow
- Subtle border glow on hover
- Tilt effect following mouse (3D transform)
- Smooth transitions (200-300ms)
- Click feedback for interactive cards

### Form Interactions
**Guide users through forms:**
- Input focus states with border color change
- Floating labels that animate up
- Real-time validation with inline messages
- Success checkmarks for valid inputs
- Error states with shake animation
- Password strength indicators
- Character count for text areas

### Page Transitions
**Smooth between views:**
- Fade + slide for page changes
- Skeleton loaders during data fetch
- Optimistic UI updates
- Stagger animations for lists
- Route transition animations

---

## Mobile Responsiveness

### Mobile-First Approach
**Design for mobile, enhance for desktop:**
- Touch targets minimum 44x44px
- Generous padding and spacing
- Sticky bottom navigation on mobile
- Collapsible sections for long content
- Swipeable cards and galleries
- Pull-to-refresh where appropriate

### Responsive Patterns
**Adapt layouts intelligently:**
- Hamburger menu → full nav bar
- Card grid → stack on mobile
- Sidebar → drawer
- Multi-column → single column
- Data tables → card list
- Hide/show elements based on viewport

---

## Loading & Empty States

### Loading States
**Never leave users wondering:**
- Skeleton screens matching content layout
- Progress bars for known durations
- Animated placeholders
- Spinners only for short waits (<3s)
- Stagger loading for multiple elements
- Shimmer effects on skeletons

### Empty States
**Make empty states helpful:**
- Illustrations or icons
- Helpful copy explaining why it's empty
- Clear CTA to add first item
- Examples or suggestions
- No "no data" text alone

---

## Unique Elements to Stand Out

### Distinctive Features
**Add personality:**
- Custom cursor effects on landing pages
- Animated page numbers or section indicators
- Unusual hover effects (magnification, distortion)
- Custom scrollbars
- Glassmorphism for overlays
- Animated SVG icons
- Typewriter effects for hero text
- Confetti or celebration animations for actions

### Interactive Elements
**Engage users:**
- Drag-and-drop interfaces
- Sliders and range controls
- Toggle switches with animations
- Progress steps with animations
- Expandable/collapsible sections
- Tabs with slide indicators
- Image comparison sliders
- Interactive demos or playgrounds

---

## Consistency Rules

### Maintain Consistency
**What should stay consistent:**
- Spacing scale (4px, 8px, 16px, 24px, 32px, 48px, 64px)
- Border radius values
- Animation timing (200ms, 300ms, 500ms)
- Color system (primary, secondary, accent, neutrals)
- Typography scale
- Icon style (outline vs filled)
- Button styles across the app
- Form element styles

### What Can Vary
**Project-specific customization:**
- Color palette (different colors, same system)
- Layout creativity (grids, asymmetry)
- Illustration style
- Animation personality
- Feature-specific interactions
- Hero section design
- Card styling variations
- Background patterns or textures

---

## Technical Excellence

### Performance
- Optimize images (WebP, lazy loading)
- Code splitting for faster loads
- Debounce search inputs
- Virtualize long lists
- Minimize re-renders
- Use proper memoization

### Accessibility
- Keyboard navigation throughout
- ARIA labels where needed
- Focus indicators visible
- Screen reader friendly
- Sufficient color contrast
- Respect reduced motion preferences

---

## Key Principles

1. **Be Bold** - Don't be afraid to try unique layouts and interactions
2. **Be Consistent** - Use the same patterns for similar functions
3. **Be Responsive** - Design works beautifully on all devices
4. **Be Fast** - Animations are smooth, loading is quick
5. **Be Accessible** - Everyone can use what you build
6. **Be Modern** - Use current design trends and technologies
7. **Be Unique** - Each project should have its own personality
8. **Be Intuitive** - Users shouldn't need instructions


---

# Project-Specific Customizations

**IMPORTANT: This section contains the specific design requirements for THIS project. The guidelines above are universal best practices - these customizations below take precedence for project-specific decisions.**

## User Design Requirements

# Lab Results Entry & Validation

## Overview
Develop a robust, user-friendly module for AquaTrace that enables accurate entry, validation, and management of SPC (Spoiled/Standard Plate Count) and Total Coliform results. The system should support configurable threshold rules per customer/site, file attachments from instruments, versioned edits with audit logs, and batch CSV import with mapping and preview. This feature will power a Lab Technician Dashboard (desktop-focused) and a Lab Results Entry Page for inputting SPC and Total Coliform results, with safety-critical runtime guards to prevent null/undefined runtime errors.

## Components to Build
1) Lab Technician Dashboard (Desktop)
- Purpose: Display samples queued for lab testing, status of SPC/Total Coliform results, and access to entry and validation flows.
- Data presentation: Quote-approved queue with sortable columns (Sample ID, Customer, Site, Collection Date, On-site status, SPC Result, Coliform Result, Entry Status, Last Modified).
- Actions: Quick-entry panel to begin or continue results entry; access to Lab Results Entry Page; filter by queue status, due date, and site.
- Validation hooks: Real-time validation for numeric ranges and unit consistency when values are entered.
- Guards: Ensure all arrays are safely mapped using (items ?? []).map(...), with isArray guards where needed.

2) Lab Results Entry Page
- Form Layout: Segmented form with fields for SPC result, Total Coliform result, units, detection method, date/time, and instrument output file attachments (uploads for CSV/XLSX, PDF lab certificates, images).
- Validation: Client-side form-level validation and server-side validation for numeric ranges, units, and allowed methods. Display inline validation messages.
- Attachments: File input with drag-and-drop, size/type restrictions, and secure storage references (e.g., presigned URLs, object storage path).
- Versioning: Every save creates a new version entry with timestamp, user, and diff summary. Ability to revert to previous versions with an audit trail.
- CSV Import: Batch CSV import feature with mapping (CSV column -> field), preview of mapped data, validation of each row, and import job with status tracking.
- Safety: All array-based fields initialized as empty arrays in state; guard against null results from API calls using data ?? [] and Array.isArray checks.

3) Validation & Rule Engine
- Thresholds: Configurable per customer/site for SPC and Total Coliform with upper/lower bounds, units, and allowed detection methods.
- Flags: If values are out-of-range or inconsistent, flag with severity (warning, error) and prevent progression pending supervisor approval.
- Rule configuration UI: Admin-facing interface to set thresholds, units, and methods per customer/site, with version history.

4) API Layer (Backend)
- Endpoints: 
  - GET /samples/queued to fetch samples awaiting lab entry
  - POST /results to create new SPC/Total Coliform results (with versioning)
  - PUT /results/{id} to update results and create new version
  - GET /results/{id} to fetch a result and its version history
  - POST /results/import to handle batch CSV import with mapping
  - POST /results/{id}/revert to revert to a previous version
  - POST /attachments to upload instrument output files
  - GET /thresholds to fetch per-site/customer threshold config; POST/PUT to update thresholds
- Data models: Samples, Results, ResultVersions, Attachments, ThresholdConfigs, AuditLogs, CSVImportJobs
- Security: JWT-based authentication; role-based access control (Lab Technician, Lab Manager, Admin, etc.)

5) Integration & Data Flow
- When a sample is selected in the Lab Technician Dashboard, preload any existing result data (if editing) and present the Lab Results Entry Page.
- On save, validate locally, then push to backend with versioning; run server-side validation against configured thresholds; if out-of-range, mark as flagged and require manager action.
- Attachments are stored securely; metadata in the DB references storage path, mime type, size, and version.
- CSV import creates a staging preview and a final import job with per-row validation, reporting errors per row.
- All actions generate audit logs for traceability (who did what, when, old vs new values).

## User Experience Flow
- Step 1: Lab Technician logs in (desktop). Accesses Lab Technician Dashboard.
- Step 2: Technician views the Sample Queue, filters by site/date, selects a sample ready for SPC/Total Coliform entry.
- Step 3: Technician clicks to open Lab Results Entry Page. Preloads existing data if present.
- Step 4: Technician enters SPC and Total Coliform values, selects units, and optionally attaches instrument output files.
- Step 5: Real-time client-side validation runs; if numeric out-of-range, the UI highlights fields and shows explanations. User can proceed if acceptable or escalate.
- Step 6: Technician saves. Client sends data to backend; server validates against threshold configs, creates a new Result record, and creates a new ResultVersion. Attachments are stored with references.
- Step 7: If all validations pass, the result is marked ready for Manager review; otherwise, a flagged state is shown with required manager action.
- Step 8: Lab Manager reviews flagged results, approves or requests corrections, and can export to PDF; PDFs are generated with embedded results, audit trail, and attached documents.
- Step 9: Approved results are distributed to the customer via PDF delivery; history and audit logs preserved.
- Step 10: Admin/Management can configure threshold policies per customer/site and manage user roles.

## Technical Specifications

Data Models
- Sample:
  - id (string)
  - customerId (string)
  - siteId (string)
  - collectionDate (string: ISO)
  - status (string) // e.g., "queued", "in_progress", "completed"
  - createdAt, updatedAt
- Result:
  - id (string)
  - sampleId (string)
  - spcValue (number | null)
  - spcUnit (string | null)
  - totalColiformValue (number | null)
  - totalColiformUnit (string | null)
  - method (string | null)
  - enteredBy (string) // userId
  - enteredAt (string)
  - version (number)
  - status (string) // "draft", "validated", "flagged", "approved"
  - flags (array of strings) // e.g., ["out_of_range", "unit_mismatch"]
- ResultVersion:
  - id (string)
  - resultId (string)
  - version (number)
  - dataSnapshot (JSON) // serialized fields at this version
  - changedBy (string)
  - changedAt (string)
  - note (string | null)
- Attachment:
  - id (string)
  - resultId (string)
  - fileName (string)
  - mimeType (string)
  - size (number)
  - storagePath (string)
  - uploadedAt (string)
- ThresholdConfig:
  - id (string)
  - customerId (string)
  - siteId (string)
  - spcMin (number | null)
  - spcMax (number | null)
  - spcUnit (string)
  - tcMin (number | null)
  - tcMax (number | null)
  - tcUnit (string)
  - effectiveFrom (string)
  - effectiveTo (string | null)
- AuditLog:
  - id, action, userId, sampleId, resultId, changes (JSON), timestamp
- CSVImportJob:
  - id, uploadedBy, status, totalRows, successRows, failedRows, createdAt, completedAt, errors (array)

API Endpoints
- GET /samples/queued
  - Returns: { data: Sample[] | null, count: number }
  - Safeguards: ensure data ?? [], Array.isArray(data)
- GET /results/{id}
  - Returns: { data: Result | null, versions: ResultVersion[], attachments: Attachment[] }
  - Validation: map response with defaults: const res = response?.data ?? {}; const result = Array.isArray(res) ? res[0] : res;
- POST /results
  - Body: { sampleId, spcValue, spcUnit, totalColiformValue, totalColiformUnit, method, attachments[]
  - Returns: { id, version, status }
- PUT /results/{id}
  - Body: { spcValue, spcUnit, totalColiformValue, totalColiformUnit, method, note, attachments[] }
- POST /results/import
  - Body: { csvFile, mappings: { csvColumn: fieldName }, previewOnly: boolean }
  - Returns: { jobId, previewRows: Array }
- POST /attachments
  - Body: { resultId, fileName, mimeType, size, storagePath }
- POST /results/{id}/revert
  - Body: { toVersion: number, note?: string }
- GET /thresholds
  - Params: customerId, siteId
  - Returns: ThresholdConfig

Security
- Use JWT-based authentication; roles: Technician, LabTech, LabManager, Admin, CustomerView.
- Endpoint access restrictions:
  - Technician: GET queued, GET sample, POST results, POST attachments
  - LabTech: GET/POST results, PUT results, CSV import
  - LabManager: POST approvals, export PDFs, revert versions
  - Admin: manage customers/sites/thresholds/users
- All responses must be sanitized; never expose secrets.

Validation
- Frontend:
  - Numeric fields must parse to finite numbers; show error if NaN or out of range.
  - Threshold units must match configured units; warn if mismatched but allow as exception only with a flag.
  - Required fields: sampleId, spcValue, totalColiformValue, units, method, enteredBy.
  - Attachments: limit types to application/pdf, image/*, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; max size 50MB per file.
- Backend:
  - Re-validate numeric ranges against thresholdConfig at time of request.
  - Constrain values to null where not provided; ensure integrity.
  - Audit logs created for every create/update/revert/import action.
- Null-safety:
  - All array results from Supabase-like calls should use data ?? [].
  - Use Array.isArray checks where appropriate.
  - Initialize React state with appropriate defaults: useState<Result[]>([]) for results, useState<Attachment[]>([]) for attachments, etc.

Acceptance Criteria
- [ ] UI: Lab Technician Dashboard renders a sortable queue with correct data bindings and safe rendering (no undefined errors).
- [ ] Entry Page: Form supports SPC and Total Coliform entry with in-line validation, unit consistency checks, and optional attachments.
- [ ] Validation: Server enforces threshold rules per customer/site; out-of-range values flag appropriately and require manager review before final distribution.
- [ ] Versioning: Every edit creates a new version; ability to revert with audit log and UI indicators showing version history.
- [ ] CSV Import: Batch import supports mapping, preview, per-row validation, and a final import job with status reporting.
- [ ] Attachments: Instrument outputs and scanned certificates stored securely with retrievable metadata.
- [ ] Security: All endpoints enforce role-based access controls and proper authentication; sensitive data not exposed.
- [ ] Reliability: All API responses validated for shape, with defaults applied to avoid nulls (e.g., const list = Array.isArray(response?.data) ? response.data : []).

UI/UX Guidelines
- Maintain design language consistency with the AquaTrace app: typography, spacing, color tokens, and elevation.
- Use clear affordances for validation errors and flagged results; consistent icons and status chips.
- Prefer desktop-first layouts for the Lab Technician Dashboard with responsive adjustments for smaller viewports where necessary.
- Provide accessible labels, keyboard navigation, and screen-reader friendly error messages.
- Ensure loading skeletons for long-running CSV imports or data fetches.
- Provide inline help tooltips near units, thresholds, and methods.

Mandatory Coding Standards — Runtime Safety

CRITICAL: Implement the following runtime safety measures in ALL generated code.

1) Supabase query results:
- Always apply nullish coalescing: const items = data ?? []; when consuming query results.
- Example: const samples = (response?.data ?? []) as Sample[];

2) Array methods safety:
- Do not call .map(), .filter(), .reduce(), .forEach(), .find(), .some(), .every() on values that could be null/undefined.
- Use guards: const safeItems = Array.isArray(items) ? items : []; const mapped = safeItems.map(...);

3) React useState defaults for arrays/objects:
- Initialize with correct types: const [results, setResults] = useState<Result[]>([]);
- Avoid useState() or useState(null) for array/object states.

4) API response shapes:
- Validate responses: const list = Array.isArray(response?.data) ? response.data : [];

5) Optional chaining:
- Access nested properties safely: obj?.property?.nestedProp

6) Destructuring with defaults:
- Use defaults: const { items = [], count = 0 } = response ?? {};

Project Context Alignment
- Ensure flow supports the five login levels (Technician, Lab Tech, Lab Manager, Admin, Customer Viewer) consistent with the broader AquaTrace auth model.
- Integrate with existing customer/site configuration and user management services.
- Ensure auditability and PDF generation flow for final customer delivery, including embedding version history and attachments into the generated PDF.

Deliverables
- Fully wired frontend components: Lab Technician Dashboard, Lab Results Entry Page, CSV Import UI.
- Backend API endpoints with robust validation, error handling, and security.
- Threshold configuration module with per-customer/site scoping.
- Attachment handling and storage strategy, with retrieval paths and metadata.
- Comprehensive unit and integration tests covering data flows, validations, and versioning.
- Documentation: API contract, data model diagrams, and user-facing help notes.

Notes for Implementation
- Use TypeScript with strict null checks enabled.
- Use a modular architecture: components, services (API layer), hooks for data fetching and state management, and a centralized validation library.
- Implement feature flags or configuration toggles to enable/disable the Lab Results Entry workflow per environment.
- Provide a migration plan for adding versioned results and threshold configs to an existing database schema.

This prompt should guide an AI development tool to implement a complete, safe, and auditable Lab Results Entry & Validation feature that aligns with the AquaTrace platform’s architecture, security model, and UX expectations.

## Implementation Notes

When implementing this project:

1. **Follow Universal Guidelines**: Use the design best practices documented above as your foundation
2. **Apply Project Customizations**: Implement the specific design requirements stated in the "User Design Requirements" section
3. **Priority Order**: Project-specific requirements override universal guidelines when there's a conflict
4. **Color System**: Extract and implement color values as CSS custom properties in RGB format
5. **Typography**: Define font families, sizes, and weights based on specifications
6. **Spacing**: Establish consistent spacing scale following the design system
7. **Components**: Style all Shadcn components to match the design aesthetic
8. **Animations**: Use Motion library for transitions matching the design personality
9. **Responsive Design**: Ensure mobile-first responsive implementation

## Implementation Checklist

- [ ] Review universal design guidelines above
- [ ] Extract project-specific color palette and define CSS variables
- [ ] Configure Tailwind theme with custom colors
- [ ] Set up typography system (fonts, sizes, weights)
- [ ] Define spacing and sizing scales
- [ ] Create component variants matching design
- [ ] Implement responsive breakpoints
- [ ] Add animations and transitions
- [ ] Ensure accessibility standards
- [ ] Validate against user design requirements

---

**Remember: Always reference this file for design decisions. Do not use generic or placeholder designs.**
