import { createBrowserRouter, Navigate } from 'react-router-dom'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { AuthLayout } from '@/components/layout/auth-layout'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PortalLayout } from '@/components/layout/portal-layout'

import { LandingPage } from '@/pages/landing'
import { LoginPage } from '@/pages/auth/login'
import { SignupPage } from '@/pages/auth/signup'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password'
import { VerifyEmailPage } from '@/pages/auth/verify-email'

import { DashboardOverview } from '@/pages/dashboard/overview'
import { SamplesPage } from '@/pages/dashboard/samples'
import { LabQueuePage } from '@/pages/dashboard/lab'
import { ApprovalsPage } from '@/pages/dashboard/approvals'
import { ReportsPage } from '@/pages/dashboard/reports'
import { CustomersPage } from '@/pages/dashboard/customers'
import { InvoicingPage } from '@/pages/dashboard/invoicing'
import { AnalyticsPage } from '@/pages/dashboard/analytics'
import { ProfilePage } from '@/pages/dashboard/profile'

import { CustomerPortalPage } from '@/pages/customer/portal'
import { HelpPage } from '@/pages/help'
import { PrivacyPage } from '@/pages/privacy'
import { TermsPage } from '@/pages/terms'
import { NotFoundPage } from '@/pages/not-found'
import { ErrorPage } from '@/pages/error'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/help', element: <HelpPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },

  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
    ],
  },

  {
    path: '/dashboard',
    element: (
      <SidebarProvider>
        <DashboardLayout />
      </SidebarProvider>
    ),
    children: [
      { index: true, element: <DashboardOverview /> },
      { path: 'samples', element: <SamplesPage /> },
      { path: 'lab', element: <LabQueuePage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'invoicing', element: <InvoicingPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'settings', element: <Navigate to="/dashboard/profile" replace /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '/portal',
    element: <PortalLayout />,
    children: [
      { index: true, element: <CustomerPortalPage /> },
    ],
  },

  { path: '/404', element: <NotFoundPage /> },
  { path: '/500', element: <ErrorPage /> },
  { path: '*', element: <NotFoundPage /> },
])
