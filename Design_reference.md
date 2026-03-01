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

# Notifications & Alerts

## Overview
Build a comprehensive, scalable Notifications & Alerts subsystem for AquaTrace that drives email, SMS, and push communications around core events (pickup assigned/completed, lab results ready, approvals, invoices, SLA breaches). Support user preferences, channel batching/throttling, template management with localization, retry and dead-letter handling, and webhooks for external systems. Integrate with SendGrid for emails, Twilio for SMS/voice, and Firebase Cloud Messaging for push notifications. Provide web-based settings, a mobile-first Technician Dashboard, and ensure robust runtime safety as per project standards.

## Components to Build
- [ ] Email Engine
  - Send transactional emails using SendGrid
  - Template management with localization (default/en, with internationalization hooks)
  - Events: verification, report delivery, invoice notifications, alerts
  - Data injection into templates (customer name, invoice ID, pickup ID, dates, URLs)
- [ ] SMS & Voice Engine
  - Twilio integration for SMS alerts and optional voice calls for escalations
  - Time-sensitive alerts: pickups, overdue invoices, SLA breaches
  - Throttling and batching per user preferences
  - Fallback to email if SMS fails (configurable)
- [ ] Push Notifications
  - Firebase Cloud Messaging (FCM) integration for mobile technicians and dashboards
  - Real-time push on new assignments, approvals, billing alerts
  - Web push for dashboards (modern browsers)
  - Device token management, topic-based broadcasting, and per-user targeting
- [ ] Preferences & Settings
  - User-specific notification channels, thresholds, and retention
  - System-level defaults and integrations (SendGrid, Twilio, FCM)
  - Batch throttling rules (e.g., max N messages per hour) and blackout windows
- [ ] Template Management
  - Create, edit, localize, and version email templates
  - Support placeholders with safe defaults and null handling
  - Preview mode and WYSIWYG editor (plaintext and HTML)
- [ ] Job & Event Dispatcher
  - Event bus to trigger notifications on events: pickup_assigned, pickup_completed, lab_results_ready, approval_needed, invoice_created, invoice_paid, sla_breach
  - Dead-letter queue for failed messages with retry policy
  - Retry backoff strategy and escalation to admin if persistent failures
- [ ] Webhook Integrations
  - Webhook delivery for external systems on key events
  - Retry policy and payload customization
- [ ] Audit & Telemetry
  - Logging of all notification attempts, outcomes, and retries
  - Retry counts, latency metrics, success/failure dashboards
- [ ] Admin & Settings UI Pages
  - Settings & Preferences page (page_005)
  - Admin notification configuration (integrations, templates, throttling) (page_011)
  - Template management UI (page_013)
  - Template localization & preview (page_017)
  - Alerts & Analytics dashboard (page_018)

## Implementation Requirements

### Frontend
- [ ] Settings UI
  - Per-user notification preferences (channels: Email, SMS, Push; do-not-disturb windows; throttling rules)
  - Global/system defaults for channels, templates, and retention
  - Integrations toggles (SendGrid, Twilio, FCM)
  - Data retention policy editor (time windows, archival)
  - Page integration: page_005 (Settings & Preferences) and cross-link to other admin pages
- [ ] Template Editor
  - Rich editors for Email templates with placeholders (customerName, invoiceId, pickupId, labResults, dueDate, etc.)
  - Localization switcher (language selector) with fallback
  - Live preview rendering with sample data
  - Save as new version, publish, and rollback options
  - Page: page_013
- [ ] Technician Dashboard (Mobile)
  - Mobile-first UI to view assigned pickups, capture sample readings, upload photos, and sync data
  - In-app notifications center showing recent notifications (pending actions)
  - Push-notification aware UI: show real-time alerts for new assignments or status changes
  - Page: page_018
- [ ] Admin/Dashboard UI
  - View notification delivery statuses, retry queues, and dead-letter items
  - Configure batch throttling, retention, and webhook endpoints
  - Page: page_011, page_017

### Backend
- [ ] Data Models (database tables)
  - notifications: id, event_type, recipient_user_id, channel, status, attempt_count, max_attempts, last_attempt_at, payload (JSON), template_id, created_at, updated_at, fail_reason, is_dead_letter
  - notification_channels: id, user_id, email, phone, push_token, preferred_channel, enabled, created_at, updated_at
  - templates: id, name, language, subject, html_body, text_body, version, is_published, created_by, updated_by, created_at, updated_at
  - events: id, type, payload (JSON), created_at
  - webhooks: id, url, events_enabled (array), auth_secret, retries, timeout
  - retries_log: id, notification_id, attempt_number, status, response, created_at, updated_at
  - dead_letters: id, notification_id, reason, payload, created_at
  - settings: id, key, value (JSON), scope (user/system), created_at, updated_at
- [ ] API Endpoints
  - POST /api/notifications/events -> enqueue event for processing
  - GET /api/notifications/:id/status -> fetch delivery status
  - POST /api/notifications/templates -> create/update template
  - GET /api/notifications/templates?lang=&published -> fetch localized templates
  - POST /api/notifications/webhooks -> register webhook
  - POST /api/notifications/publish -> trigger manual dispatch for testing
  - GET /api/notifications/audit -> fetch logs and metrics
  - CRUD for user notification preferences: /api/users/:id/notifications/preferences
- [ ] Event Dispatcher
  - Consume events from a message queue or in-memory event bus
  - Resolve recipient(s) from event payload
  - Build channels per user preferences
  - Render template with safe defaults; guard undefined values
  - Dispatch in parallel with per-channel rate limits
  - On failure: retry with exponential backoff up to max_attempts; on persistent failure, move to dead-letter and notify admin
- [ ] Integrations
  - Email: SendGrid API integration with template rendering
  - SMS/Voice: Twilio integration with SMS and optional Voice calls for escalations
  - Push: FCM device/token management and HTTP v1 API usage
- [ ] Validation & Safety
  - Validate all incoming payloads with schema checks
  - Safely access data with nullish coalescing and Array.isArray guards
  - Always initialize arrays/objects in state with proper defaults
- [ ] Security
  - OAuth/JWT protection for API endpoints
  - Validation of webhook signatures
  - Role-based access control for admin pages (5 login levels)
- [ ] Data Integrity
  - Normalize event payloads to a common shape for templates
  - Store delivery outcomes and timestamps for reporting
- [ ] Testing
  - Unit tests for template rendering with missing fields
  - Integration tests for SendGrid, Twilio, and FCM (sandbox)
  - End-to-end tests simulating events and checking notification delivery statuses
  - Resilience tests for retries and dead-letter routing

### Integration
- [ ] Event Flow
  - Event producers ( pickup assigned/completed, lab results ready, approvals needed, invoices created/paid, SLA breach ) emit to /api/notifications/events
  - Dispatcher validates event, fetches recipient preferences, determines channels, renders templates, and calls respective providers
  - Each provider returns status; update notifications table and if needed trigger webhooks
- [ ] Data Flow and Safety
  - Use data ?? [] for any list fetched from Supabase-like sources
  - Guard all arrays with Array.isArray() checks before mapping
  - Ensure useState<Type[]>([]) defaults for any array state in React components
  - Validate API responses: const list = Array.isArray(response?.data) ? response.data : []
  - Use optional chaining for nested response properties
- [ ] Dead-Letter & Retries
  - On repeated failures, push notification to dead_letters and emit an alert to admins
  - Expose metrics such as retry_count, last_error, next_retry_at

### User Experience Flow
1. Admin configures notification preferences and templates in Settings & Preferences (page_005).
2. An event occurs (e.g., pickup assigned). The system enqueues the event via /api/notifications/events.
3. Dispatcher derives recipients (technician, lab staff, customer) based on event payload and user preferences.
4. For each recipient:
   - Render appropriate template with safe defaults; if data missing, degrade gracefully.
   - Send via enabled channels (Email, SMS, Push) respecting throttling and blackout windows.
   - If success, mark notification as delivered; if partial, mark partial delivered and retry others.
   - If failure after retries, push to dead-letter queue and notify admins via a webhook and a dashboard alert.
5. For invoices and SLA breaches, schedule retries and notify customers with status updates and escalation paths (including optional voice calls via Twilio if configured).
6. Webhooks notify external systems of the event outcomes with a reliable payload and authentication.
7. Technician Dashboard shows real-time push notifications and in-app alerts; mobile app allows syncing of pickup data and photos, and displays pending notifications requiring action.

### Technical Specifications

- Data Models
  - notifications: id (uuid), event_type (enum), recipient_user_id (uuid), channel (enum), status (enum: queued, in_progress, delivered, failed, deprecated), attempt_count (int), max_attempts (int), last_attempt_at (timestamp), payload (jsonb), template_id (uuid), created_at, updated_at, fail_reason (text), is_dead_letter (boolean)
  - notification_channels: id, user_id, email (text), phone (text), push_token (text), preferred_channel (array of enums), enabled (boolean), created_at, updated_at
  - templates: id, name, language, subject, html_body, text_body, version, is_published (boolean), created_by (uuid), updated_by (uuid), created_at, updated_at
  - events: id, type (enum), payload (jsonb), created_at
  - webhooks: id, url (text), events_enabled (text[]), auth_secret (text), retries (int), timeout (int seconds), created_at
  - retries_log: id, notification_id, attempt_number, status, response (text), created_at, updated_at
  - dead_letters: id, notification_id, reason (text), payload (jsonb), created_at
  - settings: id, key (text), value (jsonb), scope (text: 'user'|'system'), created_at, updated_at

- API Endpoints
  - POST /api/notifications/events
    - Body: { event_type: string, payload: object }
    - Action: enqueue event; return 202
  - GET /api/notifications/:id/status
    - Return: { id, status, lastAttemptAt, attemptCount, failures: [ { time, reason } ] }
  - POST /api/notifications/templates
    - Body: { name, language, subject, html_body, text_body, version, is_published, template_id? }
  - GET /api/notifications/templates?lang=&published
    - Returns list with localization
  - POST /api/notifications/webhooks
    - Body: { url, events_enabled: string[], auth_secret }
  - POST /api/notifications/publish
    - Manually trigger dispatch for a test event
  - GET /api/notifications/audit
    - Query params for date range, event_type, status
  - User Preferences: /api/users/:id/notifications/preferences
    - PUT/PATCH to update channels, thresholds, and retention

- Security
  - OAuth2/JWT for API endpoints with role-based access control aligned to five login levels
  - Webhook signature validation (HMAC) on inbound/outbound webhooks
  - Rate limiting on public endpoints to protect against abuse
  - Data validation with strict schemas; default values for missing fields
  - Ensure all API responses are sanitized; never leak internal identifiers

- Validation
  - Input validation rules for event payloads and template data
  - Ensure all array-heavy responses guard against null; use (items ?? []) and Array.isArray checks
  - Use optional chaining for deeply nested fields
  - Ensure destructuring with defaults: const { items = [], count = 0 } = response ?? {}

- Acceptance Criteria
  - [ ] All events generate notifications according to per-user preferences across Email, SMS, and Push channels
  - [ ] Throttling rules prevent more than configured messages per hour per user
  - [ ] Retry logic with exponential backoff and proper dead-letter routing
  - [ ] Templates render safely even when payload fields are missing; placeholders replaced with defaults
  - [ ] Webhooks deliver payloads reliably with proper retries and authentication
  - [ ] Mobile Technician Dashboard shows real-time push alerts and supports offline sync
  - [ ] Admin UI can manage templates, preferences, integrations, and view notification analytics
  - [ ] All code guarded for null/undefined values in arrays and objects as per runtime safety guidelines

- UI/UX Guidelines
  - Consistent styling with the existing AquaTrace UI
  - Accessible components with clear error states
  - Inline validation and helpful error messages
  - Preview modes for templates and localization
  - Dashboard widgets for delivery metrics, retries, and dead-letter counts

- Mandatory Coding Standards — Runtime Safety
  - Supabase query results: Always use nullish coalescing — const items = data ?? []
  - Array methods: Guard with (items ?? []).map(...) or Array.isArray(items) ? items.map(...) : []
  - useState for arrays/objects: useState<Type[]>([]) for array state
  - API response shapes: const list = Array.isArray(response?.data) ? response.data : []
  - Optional chaining: obj?.property?.nested
  - Destructuring with defaults: const { items = [], count = 0 } = response ?? {}

- Tech Stack Alignment
  - Frontend: React (with hooks), TypeScript, centralized state management for notifications preferences and templates
  - Backend: Node.js or NestJS (preferred for structured APIs), PostgreSQL (via Supabase-compatible layer), message queue (e.g., SQS/Kafka) or in-app event bus
  - Email: SendGrid
  - SMS/Voice: Twilio
  - Push: Firebase Cloud Messaging
  - Storage: Cloud storage for templates/assets
  - Localization: i18n for emails and push content

- Data Privacy & Compliance
  - PII handling in templates and payloads
  - Audit logs for notification delivery events
  - Data retention controls per settings

- Deliverables
  - Fully functional notification subsystem with APIs, services, and queues
  - Admin UI pages wired to Settings & Preferences, Template Management, and Analytics
  - Mobile Technician Dashboard with push and offline sync support
  - Documentation for developers and operations (setup, configs, troubleshooting)
  - Tests: unit, integration, and end-to-end coverage for critical paths

- Notes on Project Context
  - AquaTrace workflow: pickups by Technician (GPS-enabled mobile), lab results, approvals by Lab Manager, invoicing, and customer reporting
  - Five login roles: Technician, Lab Tech, Lab Manager, Admin, Customer Viewer
  - Events to cover: pickup assigned/completed, lab results ready, approvals, invoices, SLA breaches
  - Integrations: Twilio SMS/voice, SendGrid emails, FCM push; optional webhooks for external systems
  - Associated pages: page_005, page_011, page_013, page_017, page_018

If you’d like, I can produce a ready-to-run project skeleton (file structure, seed data, and example API handlers) aligned to this prompt, including TypeScript types, sample templates, and test stubs.

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
