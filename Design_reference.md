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

# Search & Filter Functionality

## Overview
Build a high-performance, authorization-aware search and filtering system that spans samples, reports, customers, and invoices. The system should support indexed search, faceted filtering (date, customer, site, status), autocomplete suggestions, and saved searches. It must power multiple connected pages, including Technician Sample List (page_007), plus pages 009, 013, 017, and 019. The feature should scale to large datasets, guard against null/undefined values at runtime, and enforce role-based access across all queries and results.

## Components to Build
1) Indexed Search Engine Layer
- Implement a search index (Elasticsearch or Postgres full-text) with schemas for:
  - Samples (pickup metadata, technician_id, site, date, status)
  - Reports (lab results, SPC, Total Coliform, statuses, approvals)
  - Customers (customer info, billing, addresses)
  - Invoices (line items, totals, statuses, due dates)
- Support synonyms, stemming, and autocomplete.
- Expose a unified search service API that accepts query, facets, pagination, and sorting.

2) Frontend Search & Filter UI (Shared)
- Global Search Bar with autocomplete suggestions.
- Faceted Filters panel with:
  - Date range (startDate, endDate)
  - Customer (multi-select or typeahead)
  - Site/Location (multi-select or typeahead)
  - Status (for each entity: samples, reports, invoices)
  - Type of entity (samples, reports, customers, invoices)
- Saved Searches management (save, load, delete with user-scoped access)
- Debounced search input and keyboard navigation for suggestions
- Result cards / list views with quick actions (view, filter-by, export)

3) Technician Sample List Page (page_007)
- List view of all pickups by the technician
- Show per-row status: Pending, Submitted, Synced, Rejected
- Inline actions: view details, mark as submitted, filter-by
- Persist and apply user-selected filters and search terms
- Map integration (optional) to show geolocation of pickups
- Mobile-friendly responsive layout with accessible controls

4) Backend Services
- API Endpoints for search, facets, and saved searches
- Robust authorization checks per endpoint (role-based)
- Data fetch wrappers that guard against nulls and non-arrays
- Batch/pagination support with cursor-based or offset-based pagination
- Data validation and normalization layer for API inputs
- Sync jobs to keep search index up-to-date with DB mutations

5) Data Access & Models
- Prisma/ORM or direct SQL layer with strict typing
- Models: Sample, Report, Customer, Invoice, User, SavedSearch
- Ensure all list results are guarded with data ?? [] and Array.isArray checks

6) Integration & Orchestration
- Hook frontend search component to backend search API
- Apply frontend filters to backend queries with consistent parameter contracts
- Implement authorization-aware filtering (only return entities user is permitted to see)
- Ensure runtime safety across all data paths (null/undefined guards, default states)

## Implementation Requirements

### Frontend
- Tech stack: React (with TypeScript), Next.js or equivalent SPA framework
- State management: useState/useEffect for arrays with explicit defaults, useReducer as needed
- Hooks usage: useMemo for derived filters, useCallback for handlers
- Components:
  - SearchBar with autocomplete suggestions (debounced input, suggestion fetch, keyboard navigation)
  - FacetedFilterPanel with date picker, multi-select/typeahead components, and clear-all
  - ResultGrid / ResultList adaptable to Samples, Reports, Customers, Invoices
  - TechnicianSampleList page: list of pickups with status badges, search, and filters
  - SavedSearchManager modal/panel
- Data handling:
  - Always use data ?? [] when mapping or filtering results from API
  - Validate API responses: const list = Array.isArray(response?.data) ? response.data : []
  - Guard against nullish values before array methods: (items ?? []).map(...), Array.isArray(items) ? items.filter(...) : []
- Accessibility: aria-labels, keyboard navigable, focus management
- Performance:
  - Debounce search inputs
  - Infinite/offset pagination with fetch-on-scroll where appropriate
  - Prefetch popular saved searches
- Localization: support i18n for date formats and labels if required

### Backend
- Tech stack: Node.js/Express or NestJS, Postgres (with optional Elasticsearch)
- Endpoints:
  - GET /api/search?query=&type=&filters=&page=&limit=&sort=  (generic search)
  - POST /api/search/autocomplete  (returns top suggestions)
  - GET /api/saved-searches  (list)
  - POST /api/saved-searches  (create)
  - PUT /api/saved-searches/{id}  (update)
  - DELETE /api/saved-searches/{id}  (delete)
  - GET /api/technician/samples  (page_007 specific, with query/filters)
- Data access:
  - Use null-safe results: wrap DB results to data ?? [] before mapping
  - Validate inputs with strict schemas
  - Role-based filtering in every query (technician, lab tech, lab manager, admin)
- Search index:
  - If using Elasticsearch:
    - Index mappings for samples, reports, customers, invoices
    - Ingest pipelines for normalization
  - If using Postgres full-text:
    - Create tsvector columns and GIN indexes
- Performance:
  - Implement faceted counting queries (count distinct by facet)
  - Cached results for saved searches and popularity (TTL-based)
  - Rate limiting and pagination guarantees

### Integration
- API contracts:
  - Consistent response shapes: { data: T[], total: number, facets: FacetMap, page: number, limit: number }
  - Safe access patterns: const items = Array.isArray(response?.data) ? response.data : []
- Frontend-Backend alignment:
  - Ensure frontend passes type parameter to filter by entity type
  - Ensure saved searches store and retrieve serialized filter objects
- Security:
  - JWT/OAuth checks per request
  - Scope-based filters: technicians see only their pickups; admins see all; lab roles see their domain
  - Audit logging for search queries (optional)
- Error handling:
  - Normalize errors to user-friendly messages
  - Retry logic for transient DB/index issues

## User Experience Flow
1) User opens the app and navigates to Technician Sample List (page_007)
2) UI loads technician-specific pickups with status column
3) User uses search bar to search by sample ID, site, customer, or notes
4) User applies facets: date range, site, customer, and status to refine results
5) Results update in real-time as filters are applied; each row shows status badge and actions
6) User saves a commonly used filter as a Saved Search (optional)
7) User continues to other pages (page_009, 013, 017, 019) using the global search to locate samples, reports, customers, or invoices
8) Autocomplete suggestions appear as the user types; selecting a suggestion narrows results
9) Admin or Lab Manager reviews and approves results, generates PDFs, and distributes to customers

## Technical Specifications

- Data Models
  - Sample: id, technician_id, site_id, pickup_date, pH, chlorine, status (Pending, Submitted, Synced, Rejected), created_at, updated_at
  - Report: id, sample_id, SPC, TotalColiform, status, approved_by, approved_at, created_at
  - Customer: id, name, billing_address, contact_email, contact_phone, account_status
  - Invoice: id, customer_id, date, due_date, total_amount, status
  - User: id, role (Technician, LabTech, LabManager, Admin, Viewer), assigned_sites
  - SavedSearch: id, user_id, name, filters, query, type, created_at
- API Endpoints
  - GET /api/search
  - POST /api/search/autocomplete
  - GET /api/saved-searches
  - POST /api/saved-searches
  - PUT /api/saved-searches/{id}
  - DELETE /api/saved-searches/{id}
  - GET /api/technician/samples (page_007)
  - GET /api/ pacientes (if needed for cross-view)
- Security
  - JWT-based authentication
  - Role-based access control (RBAC) with permissions per endpoint and data scope
  - Enforce data-level filters so technicians only access their pickups; others see their domain
- Validation
  - Validate query params: page, limit, sort, type, date ranges
  - Validate filter values against allowed enums and reference data
  - Ensure arrays are normalized: const filters = Array.isArray(input?.filters) ? input.filters : []
- Runtime Safety
  - Supabase-like patterns: data ?? []
  - Guard array ops: (list ?? []).map(...), Array.isArray(list) ? list.filter(...) : []
  - React state defaults: useState<YourType[]>([])
  - Optional chaining for nested API data: item?.nested?.field
  - Destructuring with defaults: const { items = [], total = 0 } = resp ?? {}
- Performance
  - Debounced search input (e.g., 250ms)
  - Facet counts computed efficiently
  - Use pagination or cursor-based paging for large datasets
  - Enable server-side filtering to minimize payload

## Acceptance Criteria
- [ ] Search across samples, reports, customers, and invoices returns correct results with relevant facets
- [ ] Technician Sample List (page_007) shows all pickups for the technician with accurate statuses and functional filters/search
- [ ] Autocomplete suggestions are relevant and fast, with at least 5 suggestions
- [ ] Saved searches can be created, loaded, updated, and deleted, and apply instantly
- [ ] All API responses are validated and guarded against null/undefined values
- [ ] All array operations are guarded against non-arrays and null values
- [ ] RBAC ensures technicians can only access their own pickups and admins can access all data
- [ ] UI conforms to existing design system and is accessible

## UI/UX Guidelines
- Align with AquaTrace design language for typography, color, spacing
- Clear visual cues for facets and active filters
- Responsive layout with a mobile-optimized Technician Sample List
- Consistent loading states and empty-state illustrations
- Consistent error messages and retry options

## Mandatory Coding Standards — Runtime Safety

CRITICAL: Follow these rules in ALL generated code to prevent runtime crashes.

1. Supabase query results: Always use nullish coalescing — const items = data ?? []. Supabase returns null (not []) when there are no rows.
2. Array methods: Never call on a value that could be null, undefined, or a non-array. Always guard:
   - (items ?? []).map(...) or Array.isArray(items) ? items.map(...) : []
3. React useState for arrays/objects: Always initialize with the correct type — useState<Type[]>([]) for arrays.
4. API response shapes: Always validate — const list = Array.isArray(response?.data) ? response.data : []
5. Optional chaining: Use obj?.property?.nested when accessing nested objects from API responses or database queries.
6. Destructuring with defaults: const { items = [], count = 0 } = response ?? {}

---

If you want, I can convert this into a concrete starter repository structure (folders, file templates, and example code snippets) to accelerate kickoff.

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
