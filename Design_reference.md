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

# File Upload & Secure Storage

## Overview
Build a robust, secure file upload and storage subsystem to support attachments across AquaTrace: photos, CSV exports, instrument raw files, PDFs. Implement direct-to-S3 uploads via signed URLs, server-side validation, integrated virus scanning, strict access controls, lifecycle policies (archive/expire), and data integrity verification (checksums). This subsystem should be reusable by all project pages and support expiring download URLs, audit logging, and role-based permissions. It must seamlessly integrate with the Sample Pickup Form (Technician) workflows and downstream lab/management processes.

---

## Components to Build

1) File Attachment Service (Backend)
- Purpose: Orchestrate file uploads, virus scanning, storage, and lifecycle rules.
- Features:
  - Generate signed URLs for direct-to-S3 uploads (PUT or POST with fields)
  - Server-side validation for uploads (size limits, mime types, duplicates)
  - Virus scanning integration (ClamAV or API-based)
  - After-upload processing: store metadata (filename, size, mimeType, checksum, s3Key, attachmentType, relatedEntityId, ownerUserId, permissions, expiration)
  - Access control: generate secure, expiring download URLs with per-attachment ACL
  - Storage lifecycle: move/archive to cold storage after N days; expire/delete after M days if configured
  - Integrity: calculate checksum (SHA-256) on upload and verify on retrieval
  - Audit logging: record upload, scan results, access, and deletion events
  - Resilience: idempotent operations, retry policies, and idempotent signed URL creation
- Data persistence: attachments table(s) with relations to entities (e.g., pickup records, lab results), and a separate audit log.

2) Virus Scanning & Security Orchestration
- Purpose: Ensure any uploaded file is safe before or after storage.
- Features:
  - Optional pre-scan using ClamAV daemon or containerized scanner; optional external antivirus service
  - Configurable modes: scan on upload, scan on download, or scheduled batch scans
  - Handling of flagged files: quarantine, block access, notify admins, record reason
  - Large file handling strategies (streaming scan, chunked scanning)

3) Secure Storage & Access Control
- Purpose: Store files securely with per-attachment access controls and expiring links.
- Features:
  - S3 bucket strategy with:
    - Server-side encryption (SSE-S3 or SSE-KMS)
    - Object tagging for lifecycle rules (keep/archive)
    - Bucket policies to restrict access by signed URLs
  - Attachment-based access control: verify owner/relatedEntity privileges before generating access tokens
  - Expiring download URLs: short-lived (e.g., 15–60 minutes) signed URLs with nonce/claims
  - Lifecycle rules: transition to Glacier/Deep Archive after defined days; automatic deletion after retention period
  - Metadata indexing for quick search by relatedEntityId, type, date

4) Attachment API & Data Models
- Purpose: Expose endpoints for frontend to request uploads, generate signed URLs, and fetch metadata.
- Components:
  - Endpoints to request a signed URL for upload (POST)
  - Endpoints to confirm/upload metadata post-upload or to poll for scan results
  - Endpoint to generate a secure download URL for an attachment
  - Endpoint to list attachments for a given entity with pagination and safe defaults
  - Validation: ensure relatedEntityId exists, user has permission, attachment type allowed
- Data models:
  - attachments: id, s3Key, fileName, mimeType, size, checksum, uploadedAt, uploadedByUserId, relatedEntityType, relatedEntityId, accessControl (roles), expirationDate, scanStatus, scanResult, isArchived, isDeleted
  - attachment_permissions: attachmentId, userId/role, accessLevel
  - attachment_audit: id, attachmentId, action, performedBy, timestamp, details
- Validation rules: use Array.isArray checks; guard all array access; default to empty arrays where needed

5) Sample Pickup Form (Technician) Integration
- Purpose: Allow technicians to attach photos and notes per 100 mL vial pickup within the form.
- Features:
  - Attachments field supporting multiple files per pickup entry
  - Live progress for direct-to-S3 upload via signed URLs
  - Capture of additional data: GPS coordinates, timestamp, pH, chlorine, customer/site notes
  - Validate attachments before submission; store attachment metadata tied to the pickup record
  - UI hints for supported file types and size limits
  - Ensure null-safe rendering of attachment lists (guard with (attachments ?? []).map(...) or Array.isArray checks)

6) Admin & Lab Workflow Integration
- Purpose: Ensure downstream users can access, approve, and distribute results with attached files.
- Features:
  - Sanity checks: verify only authorized roles can fetch or download attachments
  - Generate and store PDFs that aggregate results and attachment references
  - Provide expiring, secure download links to customers
  - Logging of approvals and distribution actions with timestamps

---

## Implementation Requirements

### Frontend

- Tech stack: React (with hooks), Next.js or equivalent SPA framework
- Components/pages:
  - FileAttachmentUploader (reusable)
    - Props: relatedEntityType, relatedEntityId, allowedTypes, maxSize, onUploadComplete
    - Behavior:
      - Request signed URL from backend for each file
      - Upload via direct-to-S3 with form data, streaming as needed
      - Show real-time progress, retry on failure
      - After successful upload, persist metadata via API (attachment record) and associate to related entity
      - Trigger virus scan status check (poll or webhook)
      - Display list of attachments with safe, expiring download links
  - TechnicianSamplePickupForm
    - Fields: pickupId, technicianId, timestamp, GPS, pH, chlorine, notes
    - Attachments: drag-and-drop area allowing multiple files
    - Validation: required fields, numeric ranges, GPS validity
    - Submission: create pickup record and attach files; upload status per attachment
  - AttachmentListView
    - Show attachments for a given pickup or lab record, with thumbnail previews for images, file type icons, size, date
    - Actions: view (via expiring signed URL), download, delete (with permissions), retry
  - AccessControlGuard
    - Ensure UI only shows options available to the current user role (Technician, Lab Tech, Lab Manager, Admin, Customer View)
- Data handling:
  - Use useState<Type[]>([]) for album/list arrays
  - Always guard against null results: (data ?? []) or Array.isArray(data) ? data.map(...) : []
  - Validate API responses with safe defaults: const list = Array.isArray(response?.data) ? response.data : []
  - Use optional chaining when indexing nested response objects
- UI/UX:
  - Consistent styling with existing AquaTrace components
  - Progress indicators for uploads
  - Clear error messages and retry options
  - Mobile-friendly design for technicians on-site with GPS access prompts

### Backend

- Tech stack: Node.js (NestJS/Express) withPostgreSQL (or your existing DB) and integration with Supabase-like patterns
- Endpoints:
  - POST /api/attachments/signed-url
    - Body: { relatedEntityType, relatedEntityId, fileName, mimeType, fileSize, attachmentType }
    - Response: { signedUrl, fields, attachmentId, expiresAt }
  - POST /api/attachments/confirm
    - Body: { attachmentId, checksum }
    - Side effects: start/confirm virus scan, persist metadata
  - GET /api/attachments/:id/download-url
    - Response: { downloadUrl, expiresAt }
  - GET /api/attachments?relatedEntityType=...&relatedEntityId=...&limit=...&offset=...
  - POST /api/attachments/:id/approve-or-delete (for admin/lab manager workflows)
- Database schemas:
  - attachments
    - id UUID PK
    - s3Key text
    - fileName text
    - mimeType text
    - size bigint
    - checksum text
    - uploadedAt timestamptz
    - uploadedByUserId UUID (FK to users)
    - relatedEntityType text
    - relatedEntityId UUID
    - accessControl jsonb (roles allowed, explicit user IDs)
    - expirationDate timestamptz
    - scanStatus text (pending, scanning, clean, infected, failed)
    - scanResult jsonb
    - isArchived boolean
    - isDeleted boolean
  - attachment_audit
    - id UUID PK
    - attachmentId UUID FK
    - action text
    - performedBy UUID
    - timestamp timestamptz
    - details jsonb
  - permissions table or embedded in attachments as needed
- Virus scanning:
  - If using ClamAV:
    - Background worker or on-upload worker to run clamd over uploaded file
    - Update scanStatus and scanResult accordingly
  - If using external service:
    - Endpoint to submit file hash or stream; receive result
- S3 & security:
  - Create per-attachment pre-signed download URLs with limited validity
  - SSE-KMS or SSE-S3 enabled
  - Lifecycle: set lifecycle policy on bucket to transition to archive and eventually expire
  - Access logs for downloads for auditing
- Validation:
  - Enforce max file size per attachment and per upload batch
  - Enforce allowed MIME types per attachmentType
  - Validate relatedEntity existence and user permissions
- Validation frameworks:
  - Use schema validation for request bodies (Zod/Joi) and DB constraints
- Error handling:
  - Return actionable errors with codes and user-friendly messages
- Tests:
  - Unit tests for data validation, URL generation, and manifest integrity
  - Integration tests for upload flow, scan status transitions, and URL expiry

### Integration

- Identity & Access:
  - Align with existing Auth system (5 roles: Technician, Lab Tech, Lab Manager, Admin, Customer View)
  - Enforce role-based access to endpoints and UI
- Data flow:
  - Technician creates pickup, attaches files
  - Files uploaded via signed URLs; after upload, backend registers attachment and triggers virus scan
  - Lab tech accesses attachments associated with lab orders, PDFs generated with embedded attachments
  - Lab manager approves results and triggers distribution via secure URLs to customers
- Consistency:
  - All API responses follow a stable shape; consistently handle nulls and missing fields
- Observability:
  - Centralized logging for uploads, scans, downloads, and deletions
  - Metrics on upload throughput, scan times, and failed scans

---

## User Experience Flow

1) Technician opens Sample Pickup Form on mobile
2) Technician fills required fields: pickupId, timestamp (auto-timestamped), GPS (captured via device), pH, chlorine, customer/site notes
3) Technician adds attachments:
   - Selects photos, PDFs, CSV exports, instrument raw files
   - Each file is uploaded directly to S3 via a signed URL
   - Progress bars display per-file upload state
   - After upload, backend validates and queues for virus scanning
4) Upon completing pickup form, technician submits:
   - Pickup record stored with reference to attachments
   - Attachments show in a live list with status (Uploaded, Scanning, Clean, Infected)
5) Lab Tech retrieves pickup record and any attachments
   - Downloads or previews attachments via expiring signed URLs
6) Lab runs SPC and Total Coliform tests; results are appended to the related record
7) Lab Manager reviews results, approves, and triggers generation of a comprehensive PDF report including attachments
8) Admin distributes report to customer via expiring secure download URL
9) Attachments follow lifecycle rules: archived after N days, expired and purged after retention period
10) All actions are auditable; admins receive notifications on AV scans failures or access anomalies

---

## Technical Specifications

Data Models
- attachments
  - id: UUID PK
  - s3Key: string
  - fileName: string
  - mimeType: string
  - size: number
  - checksum: string
  - uploadedAt: timestamp
  - uploadedByUserId: UUID
  - relatedEntityType: string
  - relatedEntityId: UUID
  - accessControl: JSON
  - expirationDate: timestamp
  - scanStatus: string
  - scanResult: JSON
  - isArchived: boolean
  - isDeleted: boolean
- attachment_audit
  - id: UUID PK
  - attachmentId: UUID FK
  - action: string
  - performedBy: UUID
  - timestamp: timestamp
  - details: JSON

API Endpoints
- POST /api/attachments/signed-url
  - Input: { relatedEntityType, relatedEntityId, fileName, mimeType, fileSize, attachmentType }
  - Output: { attachmentId, signedUrl, fields?, expiresAt }
- POST /api/attachments/confirm
  - Input: { attachmentId, checksum }
  - Action: initiate/confirm virus scan; validate integrity
- GET /api/attachments/:id/download-url
  - Output: { downloadUrl, expiresAt }
- GET /api/attachments?relatedEntityType=&relatedEntityId=&limit=&offset=
  - Output: { attachments: [ ... ] }
- POST /api/attachments/:id/permissions
  - Input: { userId, accessLevel } or role-based
- POST /api/attachments/:id/archive
  - Trigger lifecycle transition
- Webhooks/Events:
  - On scan complete: emit event to notify front-end or perform automated workflows

Security
- Authentication: OAuth2 / JWT with role claims
- Authorization: RBAC enforcement per endpoint
- Signed URLs: short-lived (e.g., 15-60 minutes); scoped to attachmentId
- Input Validation: strict checks on relatedEntity existence and permissions
- Data at rest: S3 SSE-KMS; encryption keys rotated per policy
- Data in transit: HTTPS only

Validation
- Frontend: required fields, numeric validation for pH and chlorine, GPS presence, file size/type checks
- Backend: validate related entities exist; verify user permissions; ensure file types and sizes are within configured limits
- API responses: shapes validated; safe defaults for empty arrays

Acceptance Criteria
- [ ] Direct-to-S3 uploads succeed with signed URLs and progress indicators in the UI
- [ ] Virus scanning is triggered after upload and results reflect in attachment metadata
- [ ] Secure, expiring download URLs are generated and work only within expiry window
- [ ] Attachments are linked to their related entities and appear in attachment lists with correct metadata
- [ ] Lifecycle rules archive/expire attachments automatically according to policy
- [ ] All API responses and UI rendering guard against null/undefined and use safe defaults
- [ ] Proper audit logs are created for uploads, scans, accesses, and deletions
- [ ] Role-based access prevents unauthorized actions across Technician, Lab Tech, Lab Manager, Admin, Customer View

UI/UX Guidelines
- Use consistent styling with AquaTrace app; components should be responsive and accessible
- Provide loading, success, and error states; display non-intrusive toasts for actions
- Show per-attachment status badges (Uploaded, Scanning, Clean, Infected, Archived)
- Provide clear indicators for signed URL expiry and retry options

Mandatory Coding Standards — Runtime Safety

CRITICAL: Follow these rules in ALL generated code to prevent runtime crashes.

1. Supabase query results: Always use nullish coalescing — const items = data ?? []. Supabase returns null when there are no rows.
2. Array methods: Never call on a value that could be null/undefined. Guard:
   - (items ?? []).map(...) or Array.isArray(items) ? items.map(...) : []
3. React useState for arrays/objects: Initialize with proper type — useState<Type[]>([]) for arrays.
4. API response shapes: Validate — const list = Array.isArray(response?.data) ? response.data : [].
5. Optional chaining: Use obj?.property?.nested when accessing nested API/db results.
6. Destructuring with defaults: const { items = [], count = 0 } = response ?? {}.

---

If you want, I can convert this into a concrete AI tool prompt (JSON/YAML) with explicit field names, examples, and test cases for an autonomous code generation system.

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
