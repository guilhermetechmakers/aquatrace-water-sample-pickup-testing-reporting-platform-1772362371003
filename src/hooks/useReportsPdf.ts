/**
 * React Query hooks for PDF Report operations (approval-details integration)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchReportsByApproval,
  fetchReportDetails,
  generateReportPdf,
  sendReportEmail,
  reissueReport,
  getReportPdfSignedUrl,
} from '@/api/reports'
import * as reportsPdfApi from '@/api/reports-pdf'
import type {
  PickupData,
  LabResults,
  ReportAttachment,
  ReportSignature,
} from '@/types/reports'

export const reportKeys = {
  all: ['reports'] as const,
  byApproval: (approvalId: string) => [...reportKeys.all, 'approval', approvalId] as const,
  details: (reportId: string, version?: number) =>
    [...reportKeys.all, 'details', reportId, version] as const,
}

export function useReportByApprovalId(approvalId: string | null) {
  return useQuery({
    queryKey: reportKeys.byApproval(approvalId ?? ''),
    queryFn: () => fetchReportsByApproval(approvalId!),
    enabled: Boolean(approvalId),
  })
}

export function useReport(reportId: string | null) {
  return useQuery({
    queryKey: reportKeys.details(reportId ?? ''),
    queryFn: () => fetchReportDetails(reportId!, undefined).then((r) => r.report),
    enabled: Boolean(reportId),
  })
}

export function useReportVersions(approvalId: string | null) {
  const { data: report } = useReportByApprovalId(approvalId)
  const versions = (report?.versions ?? []) as Array<{
    id: string
    reportId: string
    version: number
    status: 'draft' | 'approved' | 'distributed'
    pdfStoragePath?: string | null
    createdAt: string
  }>
  return { data: versions }
}

async function ensureReportForApproval(payload: {
  approvalId: string
  customerId: string
  resultId: string
  sampleId: string
}): Promise<{ id: string } | null> {
  const report = await reportsPdfApi.ensureReportForApproval(
    payload.approvalId,
    payload.customerId,
    payload.resultId,
    payload.sampleId
  )
  return report ? { id: report.id } : null
}

export function useEnsureReportForApproval() {
  return useMutation({
    mutationFn: ensureReportForApproval,
  })
}

export function useGenerateReportPdf() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      approvalId: string
      customerId: string
      version?: number
      pickupData: PickupData
      labResults: LabResults
      attachments?: ReportAttachment[]
      signature?: ReportSignature | null
      auditTrail?: Array<{ action?: string; performedBy?: string; performedAt?: string; note?: string }>
    }) => generateReportPdf(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.byApproval(variables.approvalId) })
    },
  })
}

export function useSendReportEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      reportId: string
      version: number
      recipient: string
      customerName?: string
      reportTitle?: string
      pickupDate?: string
    }) => sendReportEmail(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.details(variables.reportId) })
    },
  })
}

export function useReissueReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      reportId: string
      approvalId: string
      customerId: string
      pickupData: PickupData
      labResults: LabResults
      attachments?: ReportAttachment[]
      signature?: ReportSignature | null
      auditTrail?: Array<{ action?: string; performedBy?: string; performedAt?: string; note?: string }>
    }) => reissueReport(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.details(variables.reportId) })
      queryClient.invalidateQueries({ queryKey: reportKeys.byApproval(variables.approvalId) })
    },
  })
}

export function useReportPdfUrl(storagePath: string | null | undefined) {
  return useQuery({
    queryKey: ['report-pdf-url', storagePath],
    queryFn: () => getReportPdfSignedUrl(storagePath!),
    enabled: Boolean(storagePath),
    staleTime: 50 * 60 * 1000,
  })
}
