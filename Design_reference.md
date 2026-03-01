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

# Technician GPS Pickup & Offline Capture

## Overview
Build a mobile-first, offline-capable data capture and synchronization system for technician-led water sample pickups. Technicians capture on-site readings (pH and chlorine), GPS coordinates, photos, and barcodes for each 100 mL vial, with offline storage and robust sync to the backend. The solution includes a Technician Dashboard, Sample Pickup Form, Technician Sample List, and Sample Details Page, with proper status tracking (Pending, Submitted, Synced, Rejected) and audit trails. The system supports sequential workflows from field collection to lab testing (SPC, Total Coliform) and administration, including printing PDFs and distributing results post-approval.

## Components to Build
1) Technician GPS Pickup & Offline Capture (Core Mobile Engine)
- Mobile-first data capture module with offline-first storage (SQLite or Realm).
- Features:
  - GPS capture with high accuracy, permission handling, and timestamped location data.
  - Camera integration for photo capture with compression, EXIF preservation, and per-photo metadata.
  - Barcode/QR code scanning via device camera to link vials to pickups (scan vial IDs, batch numbers, or customer barcodes).
  - Form validation for required fields: vialId, pH, chlorine, GPS, timestamp, technicianId, customerSiteNotes.
  - Offline data queue with robust conflict resolution and exponential backoff for sync.
  - Sync engine with retry queue, conflict resolution policy, and audit trail syncing.
  - Data models for pickups, photos, barcodes, and GPS traces.
  - Data integrity guards: null checks, default values, and safe array handling.
- Tech stack hints:
  - React Native (or Flutter) with TypeScript (or Dart) for cross-platform mobile UI.
  - SQLite (via expo-sqlite or WatermelonDB) or Realm for offline storage.
  - Background sync task (Headless JS in RN or background services in Flutter) with exponential backoff.
  - Camera, Location, and Barcode scanning plugins.

2) Sample Pickup Form (Technician)
- UI: Mobile-optimized form to log each pickup with the following fields:
  - vialId (string from barcode)
  - pH (number, 0-14 with precision)
  - chlorine (number, mg/L)
  - photos (array of image objects with local URIs and EXIF)
  - gpsLatitude, gpsLongitude, gpsAccuracy
  - timestamp (auto-filled at capture)
  - customerSiteNotes (string)
  - sampleVolume (default 100 mL; fixed per vial)
  - status (Pending/Submitted)
- UX:
  - Barcode scan button to populate vialId, with fallback manual entry.
  - On-device validation with inline hints and accessible error messages.
  - Auto-save to offline storage when offline or when user hits Save Draft.
  - “Capture Photo” flow with multiple photos per pickup (minimum of 1 photo recommended).
  - Image handling: compression to reasonable size, preserve EXIF where possible.
  - GPS capture button to fetch current location; show accuracy and timestamp.
  - Timestamp UI feedback and last sync status indicator per pickup.
- Data handling:
  - Ensure all arrays are initialized as [] (useState<Type[]>([])).
  - Guard all array operations with (items ?? []).map(...) or Array.isArray(items) ? items.map(...) : [].
  - Use nullish coalescing for fetched data (data ?? []).
  - Use safe optional chaining for nested API fields.

3) Technician Sample List
- UI: List view showing all pickups by the technician with filtering and search.
- Columns/Fields:
  - vialId, timestamp, pH, chlorine, gpsAccuracy, status, synced flag, lastModified.
- Filters:
  - Status filter (Pending, Submitted, Synced, Rejected)
  - Date range picker
  - Barcode search / vialId search
  - GPS accuracy threshold
- Actions:
  - Tap to open Sample Details Page
  - Quick sync trigger for selected items (if online)
- Data handling:
  - Load data from offline store first; if online, merge with server data carefully (conflict resolution).
  - Ensure safe rendering with guards for possibly missing fields.

4) Sample Details Page
- UI: Complete record for a sample with:
  - Pickup readings: pH, chlorine, volume, timestamp
  - GPS coordinates and accuracy
  - Photos gallery with ability to view, delete (offline only with sync rules), and re-capture
  - Lab results (SPC, Total Coliform) when available
  - Audit trail: creation, updates, sync events with timestamps and technician IDs
  - Status history: Pending, Submitted, Synced, Rejected, with timestamps
  - Notes: customer/site notes, lab notes, admin notes
- Interactions:
  - Edit mode for technicians only if offline draft (with local validation)
  - Re-upload photos if re-capturing
  - Sync button to push updates when online (w/ background sync rules)
  - History timeline view with expandable entries
- Data handling:
  - Validate nested data safely using optional chaining and array guards
  - Use Array.isArray() checks for any lists (photos, audit entries)

5) Technician Dashboard (Mobile)
- UI: Mobile-first dashboard showing assigned pickups, quick capture, and sync status
- Panels:
  - Assigned Pickups: list with status, distance (from last known location), and ETA if available
  - Quick Capture: fast-entry card to begin a new pickup with one-tap barcode scan
  - Sync Center: shows pending offline items, last successful sync time, next retry ETA
  - Notifications: lab results ready or rejected pickups
- Interactions:
  - Push to start a new pickup or continue an existing draft
  - Pull-to-refresh to fetch server state (when online)
  - Offline-only indicators and retry controls
- Data handling:
  - Ensure local state mirrors offline storage structures and uses safe defaults
  - All displays rely on guarded data access with null/default handling

## Implementation Requirements

### Frontend
- UI/UX
  - Consistent visual language with the rest of AquaTrace app
  - Mobile-first responsive layouts; smooth transitions
  - Accessible components with proper aria labels and keyboard navigation
- Data handling
  - Use useState<Type[]>([]) for arrays; initialize all array state properly
  - Guard API results: const list = Array.isArray(response?.data) ? response.data : []
  - Use data ?? [] for Supabase results
  - Safe access patterns: obj?.prop?.nested
  - Form validation with clear error states and inline messages
- Offline-first behavior
  - Local storage schema with migrations; clear versioning
  - Background sync with exponential backoff (retry queue)
  - Conflict resolution strategy (e.g., last-write-wins with timestamp, or technician-hosted precedence)
- Barcode/Camera
  - Barcode/QR scanning flow with fallback input
  - Camera permissions handling and graceful fallbacks when denied
- Photos
  - Image compression on capture
  - Preserve EXIF metadata where possible
  - Local photo references (URI) and upload queue
- GPS
  - Request location permissions; handle denial gracefully
  - Capture high-accuracy coordinates; show accuracy and timestamp
- Sync
  - Implement a robust sync pipeline:
    - Upload new/updated pickups, photos, and barcode scans
    - Handle partial failures; retry with exponential backoff
    - On success, mark local records as synced and push server-side IDs
  - Conflict resolution rules documented in code comments
- Security
  - Token-based authentication (JWT/OAuth) with refresh
  - Encrypt sensitive local data at rest where applicable
  - Validate all inputs before sending to server

### Backend
- APIs
  - Create/Update Pickup (technician create/update)
  - Upload Photo
  - Scan Barcode association
  - Sync endpoint that accepts batched offline changes
  - Retrieve Sample Details, Lab Results (SPC, Total Coliform), Audit Trails
  - Admin endpoints for users, customers, invoicing as per broader project needs
  - API versioning and optimistic concurrency controls (etag or version field)
- Database
  - Tables/collections:
    - pickups: id, vialId, pH, chlorine, volume, timestamp, gpsLat, gpsLon, gpsAccuracy, technicianId, customerSiteNotes, status, synced, serverId, createdAt, updatedAt
    - photos: id, pickupId, localUri, serverUrl, metadata (EXIF), createdAt, synced
    - barcodes: id, vialId, scannedAt, location, technicianId
    - audit_trail: id, pickupId, action, byUserId, timestamp
    - lab_results: id, pickupId, SPC, TotalColiform, status, approvedBy, approvedAt
    - status_history: id, pickupId, status, timestamp, note
  - Data integrity:
    - Use nullish coalescing in server responses
    - Validate required fields server-side; return structured error messages
- Sync rules
  - Endpoint to fetch pending changes for a technician
  - Resolve conflicts using a clear policy; provide a mechanism to audit conflicts

### Integration
- Data flow
  - Technician workflow: local capture -> local queue -> background sync -> server -> lab results -> admin distribution
  - Samples List reads from local storage first; periodically reconcile with server when online
  - Sample Details page merges local and server state with deterministic precedence
- Offline-first to online transition
  - Sync service triggers on network availability or manual sync
  - Background tasks with exponential backoff on failures
- Third-party services
  - Barcode scanning library
  - Camera APIs
  - Location services
  - PDF generation for reports on the Lab/Admin side (as needed for distribution)

## User Experience Flow
1) Technician registers in the mobile app and lands on Technician Dashboard.
2) Technician taps “New Pickup” (or scans a vial barcode) to start a pickup entry.
3) Capture GPS location, timestamp, pH, chlorine, and volume; attach 1+ photos; scan vial barcode; add site notes.
4) Save as draft (offline-first) or submit/send (if online) to push to server queue.
5) The Sample List shows all locally stored pickups with statuses. Technician can filter by Status, Date, or search by vialId.
6) Tap a pickup in the list to open Sample Details Page:
   - Review readings, photos, GPS, and audit trail
   - See lab results when available
   - View status history
   - Edit fields if in draft/offline
   - Trigger photo re-upload or re-capture
7) Use Technician Dashboard to view assigned pickups, capture readings and photos, and monitor sync status.
8) When network is available, background sync runs with exponential backoff until all offline items are uploaded.
9) Lab phase: Lab tech logs SPC and Total Coliform; results are uploaded, approved by Lab Manager, and PDFs generated and distributed to customer.
10) Admin handles customers, invoicing, and AR; reports can be generated and accessed per user permissions.
11) All sensitive operations are protected by authentication and role-based access control.

## Technical Specifications

Data Models: Schema Details
- Pickup
  - id: string (local)
  - serverId: string | null
  - vialId: string
  - pH: number | null
  - chlorine: number | null
  - volume: number (default 100)
  - timestamp: string (ISO)
  - gpsLat: number | null
  - gpsLon: number | null
  - gpsAccuracy: number | null
  - technicianId: string
  - customerSiteNotes: string | null
  - photos: string[] (local URIs) or separate Photos table with pickupId relation
  - status: string (Pending | Submitted | Synced | Rejected)
  - synced: boolean
  - createdAt: string
  - updatedAt: string

- Photo
  - id: string
  - pickupId: string
  - localUri: string
  - serverUrl: string | null
  - exif: object | null
  - createdAt: string
  - synced: boolean

- BarcodeScan
  - id: string
  - vialId: string
  - pickupId: string | null
  - scannedAt: string
  - technicianId: string

- AuditTrail
  - id: string
  - pickupId: string
  - action: string (Created, Updated, Synced, etc.)
  - byUserId: string
  - timestamp: string

- LabResult
  - id: string
  - pickupId: string
  - SPC: number | null
  - TotalColiform: number | null
  - status: string (PendingApproval, Approved, Rejected)
  - approvedBy: string | null
  - approvedAt: string | null

- StatusHistory
  - id: string
  - pickupId: string
  - status: string
  - timestamp: string
  - note: string | null

API Endpoints (Routes and Methods)
- POST /api/pickups
  - Create a new pickup from technician draft
  - Body: { vialId, pH, chlorine, volume, timestamp, gpsLat, gpsLon, gpsAccuracy, technicianId, customerSiteNotes, photos: [{ localUri, exif }] }
- PATCH /api/pickups/{id}
  - Update a pickup
  - Body: partial fields (pH, chlorine, photos, notes, status)
- POST /api/pickups/{id}/photos
  - Upload a photo for a pickup
  - Body: form-data with file + metadata
- POST /api/pickups/sync
  - Sync batched offline pickups from device
  - Body: { items: [pickupDrafts], photos: [...], barcodes: [...] }
- GET /api/pickups/{id}
  - Get complete pickup with lab results and audit trail
- GET /api/pickups?technicianId=&status=&dateFrom=&dateTo=
  - List pickups for technician with filters
- GET /api/lab-results/{pickupId}
  - Retrieve lab results for a pickup
- POST /api/lab-results/{pickupId}
  - Submit SPC and Total Coliform results
- POST /api/admin/approve-lab-results
  - Lab Manager approves and triggers PDF generation and distribution
- GET /api/reports/customer/{customerId}
  - Generate or retrieve PDF reports for a customer

Security
- Authentication: OAuth 2.0 / JWT with role-based access control (Technician, LabTech, LabManager, Admin, Viewer)
- Transport: HTTPS
- Access control: Verify technicianId in requests; enforce permissions on server
- Data privacy: Encrypt sensitive local data at rest; minimal personally identifiable data transmitted; audit logs

Validation
- Frontend:
  - Validate vialId present; pH in 0-14; chlorine non-negative; GPS coordinates valid when captured
  - Ensure photos array length > 0 for submitted pickups; otherwise allow draft
  - Timestamps must be valid ISO strings
- Backend:
  - Validate all required fields; reject invalid data with explicit error messages
  - Ensure serverId uniqueness where applicable
  - Validate lab results keys when provided

Acceptance Criteria
- [ ] Offline-first flow works: data is captured while offline and syncs automatically with conflict resolution and retry queue
- [ ] All lists and detail views guard against null/undefined data using Array.isArray checks and nullish coalescing
- [ ] GPS, barcode scanning, and photo capture flow work on device with proper permission handling
- [ ] Sample List supports filters (status, date) and search by vialId
- [ ] Sample Details page shows complete record including audit trail and status history
- [ ] Technician Dashboard shows assigned pickups, sync status, and quick capture
- [ ] Backend API supports batched sync and proper conflict handling; lab results flow complete with PDF generation and distribution

UI/UX Guidelines
- Match AquaTrace styling: typography, color palette, spacing, and components
- Clear micro-interactions for offline/sync status
- Accessible controls with good tap targets on mobile
- Consistent form labeling and inline validation
- Provide empty-state illustrations/messages for no data scenarios

Mandatory Coding Standards — Runtime Safety
CRITICAL: Follow these rules in ALL generated code to prevent runtime crashes.

1. Supabase query results: Always use nullish coalescing — const items = data ?? []. Supabase returns null (not []) when there are no rows.
2. Array methods: Never call on a value that could be null/undefined/non-array. Guard:
   - (items ?? []).map(...) or Array.isArray(items) ? items.map(...) : []
3. React useState for arrays/objects: Always initialize with the correct type — useState<Type[]>([])
4. API response shapes: Always validate — const list = Array.isArray(response?.data) ? response.data : []
5. Optional chaining: Use obj?.property?.nested when accessing nested objects from API responses or database queries
6. Destructuring with defaults: const { items = [], count = 0 } = response ?? {}

Notes for Implementation Tools
- Provide a single cohesive development prompt that can be fed to an AI coding assistant or generator.
- Include explicit folder structure, component/interface definitions, and example code snippets demonstrating safe handling patterns (null checks, guards, and defaults).
- Include test scaffolds: unit tests for data models, integration tests for API endpoints, and end-to-end test scenarios for the offline-to-online sync flow.
- Include mocks for Supabase or backend services to enable isolated local development.

Project Context Mapping
- TARGET FEATURE: Technician GPS Pickup & Offline Capture
- Core requirements include: mobile GPS, photo capture, barcode scanning, offline storage, sync, and status-driven pages
- Associated Pages (to be implemented in the app router/navigation):
  - page_005: Technician Dashboard (Mobile)
  - page_006: Sample Pickup Form (Technician)
  - page_007: Technician Sample List
  - page_008: Sample Details Page
- Multi-role workflow including Lab Tech and Admin with eventual PDF generation and distribution

Deliverables
- A complete, detailed prompt that can be used by an AI development tool to generate:
  - Frontend React Native (or Flutter) code with offline-first storage
  - Backend API endpoints and database schema
  - Sync service with retry/backoff and conflict resolution
  - Data models, validators, and utility functions enforcing runtime safety
- Include sample data seeds, migration scripts, and a minimal test suite
- Provide explicit code patterns that guarantee runtime safety as described in the Runtime Safety section

End of Prompt.

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
