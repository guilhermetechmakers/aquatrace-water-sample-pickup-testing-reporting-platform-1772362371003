import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { AuthLayout } from '@/components/layout/auth-layout'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PortalLayout } from '@/components/layout/portal-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { GuestRoute } from '@/components/auth/guest-route'

import { LandingPage } from '@/pages/landing'
import { LoginPage } from '@/pages/auth/login'
import { SignupPage } from '@/pages/auth/signup'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password'
import { ResetPasswordPage } from '@/pages/auth/reset-password'
import { VerifyEmailPage } from '@/pages/auth/verify-email'
import { AuthCallbackPage } from '@/pages/auth/auth-callback'

import { DashboardOverview } from '@/pages/dashboard/overview'
import { SamplesPage } from '@/pages/dashboard/samples'
import { LabTechnicianDashboardPage } from '@/pages/dashboard/lab-technician-dashboard'
import { LabResultsEntryPage } from '@/pages/dashboard/lab-results-entry'
import { LabCSVImportPage } from '@/pages/dashboard/lab-csv-import'
import { ThresholdConfigPage } from '@/pages/dashboard/admin/threshold-config'
import { AdminBillingPage } from '@/pages/dashboard/admin/billing'
import { LabManagerDashboardPage } from '@/pages/dashboard/lab-manager-dashboard'
import { ApprovalDetailsPage } from '@/pages/dashboard/approval-details'
import { ReportsPage } from '@/pages/dashboard/reports'
import { DistributionPage } from '@/pages/dashboard/distribution'
import { CustomersPage } from '@/pages/dashboard/customers'
import { InvoicingPage } from '@/pages/dashboard/invoicing'
import { AnalyticsPage } from '@/pages/dashboard/analytics'
import { ProfilePage } from '@/pages/dashboard/profile'
import { AdminPage } from '@/pages/dashboard/admin'
import { TechnicianDashboardPage } from '@/pages/dashboard/technician-dashboard'
import { SamplePickupFormPage } from '@/pages/dashboard/sample-pickup-form'
import { SampleListPage } from '@/pages/dashboard/sample-list'
import { SampleDetailsPage } from '@/pages/dashboard/sample-details'

import { CustomerPortalPage } from '@/pages/customer/portal'
import { ReportViewerPage } from '@/pages/customer/report-viewer'
import { ShareLinkViewPage } from '@/pages/customer/share-link-view'
import { HelpPage } from '@/pages/help'
import { PrivacyPage } from '@/pages/privacy'
import { TermsPage } from '@/pages/terms'
import { NotFoundPage } from '@/pages/not-found'
import { ErrorPage } from '@/pages/error'
import { AUTH_ROLES } from '@/types/auth'

const DASHBOARD_ROLES = AUTH_ROLES.filter((r) => r !== 'CUSTOMER_VIEW')
const PORTAL_ROLES = ['CUSTOMER_VIEW' as const]

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/help', element: <HelpPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },

  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: (
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        ),
      },
      {
        path: '/signup',
        element: (
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        ),
      },
      {
        path: '/forgot-password',
        element: (
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        ),
      },
      {
        path: '/reset-password',
        element: (
          <GuestRoute>
            <ResetPasswordPage />
          </GuestRoute>
        ),
      },
      {
        path: '/verify-email',
        element: (
          <GuestRoute>
            <VerifyEmailPage />
          </GuestRoute>
        ),
      },
      {
        path: '/auth/callback',
        element: <AuthCallbackPage />,
      },
    ],
  },

  {
    path: '/dashboard',
    element: (
      <ProtectedRoute allowedRoles={DASHBOARD_ROLES}>
        <SidebarProvider>
          <DashboardLayout />
        </SidebarProvider>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardOverview /> },
      {
        path: 'pickups',
        children: [
          { index: true, element: <TechnicianDashboardPage /> },
          { path: 'new', element: <SamplePickupFormPage /> },
          { path: 'samples', element: <SampleListPage /> },
          { path: ':id', element: <SampleDetailsPage /> },
        ],
      },
      { path: 'samples', element: <SamplesPage /> },
      {
        path: 'lab',
        element: <Outlet />,
        children: [
          { index: true, element: <LabTechnicianDashboardPage /> },
          { path: 'entry/:sampleId', element: <LabResultsEntryPage /> },
          { path: 'import', element: <LabCSVImportPage /> },
        ],
      },
      {
        path: 'approvals',
        element: <Outlet />,
        children: [
          { index: true, element: <LabManagerDashboardPage /> },
          { path: ':id', element: <ApprovalDetailsPage /> },
        ],
      },
      {
        path: 'reports',
        element: <Outlet />,
        children: [
          { index: true, element: <ReportsPage /> },
          { path: 'distribution', element: <DistributionPage /> },
        ],
      },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'invoicing', element: <InvoicingPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      {
        path: 'admin',
        element: <Outlet />,
        children: [
          { index: true, element: <AdminPage /> },
          { path: 'thresholds', element: <ThresholdConfigPage /> },
          { path: 'billing', element: <AdminBillingPage /> },
        ],
      },
      { path: 'users', element: <AdminPage /> },
      { path: 'audit', element: <AdminPage /> },
      { path: 'settings', element: <Navigate to="/dashboard/profile" replace /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '/portal',
    element: (
      <ProtectedRoute allowedRoles={PORTAL_ROLES}>
        <PortalLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <CustomerPortalPage /> },
      { path: 'reports/:reportId', element: <ReportViewerPage /> },
    ],
  },
  {
    path: '/portal/share/:token',
    element: (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <ShareLinkViewPage />
        </main>
      </div>
    ),
  },

  { path: '/404', element: <NotFoundPage /> },
  { path: '/500', element: <ErrorPage /> },
  { path: '*', element: <NotFoundPage /> },
])
