/**
 * Sample Management Workflow - State Machine
 * Enforces valid transitions based on current state and user role.
 * States: Draft, PendingPickup, Pending, Submitted, InLab, LabApproved, Archived, Rejected
 */

import type { SamplePickupStatus } from '@/types/pickup-sample'
import type { AuthRole } from '@/types/auth'

export type WorkflowAction =
  | 'submit'
  | 'send_to_lab'
  | 'approve_results'
  | 'archive'
  | 'reject'

const TRANSITIONS: Record<
  SamplePickupStatus,
  { action: WorkflowAction; roles: AuthRole[]; toState: SamplePickupStatus }[]
> = {
  Draft: [
    { action: 'submit', roles: ['TECHNICIAN', 'ADMIN'], toState: 'Submitted' },
    { action: 'reject', roles: ['LAB_MANAGER', 'ADMIN'], toState: 'Rejected' },
  ],
  PendingPickup: [
    { action: 'submit', roles: ['TECHNICIAN', 'ADMIN'], toState: 'Submitted' },
    { action: 'reject', roles: ['LAB_MANAGER', 'ADMIN'], toState: 'Rejected' },
  ],
  Pending: [
    { action: 'submit', roles: ['TECHNICIAN', 'ADMIN'], toState: 'Submitted' },
    { action: 'reject', roles: ['LAB_MANAGER', 'ADMIN'], toState: 'Rejected' },
  ],
  Submitted: [
    { action: 'send_to_lab', roles: ['LAB_TECH', 'LAB_MANAGER', 'ADMIN'], toState: 'InLab' },
    { action: 'reject', roles: ['LAB_MANAGER', 'ADMIN'], toState: 'Rejected' },
  ],
  Synced: [
    { action: 'send_to_lab', roles: ['LAB_TECH', 'LAB_MANAGER', 'ADMIN'], toState: 'InLab' },
    { action: 'reject', roles: ['LAB_MANAGER', 'ADMIN'], toState: 'Rejected' },
  ],
  InLab: [
    { action: 'approve_results', roles: ['LAB_MANAGER', 'ADMIN'], toState: 'LabApproved' },
    { action: 'reject', roles: ['LAB_MANAGER', 'ADMIN'], toState: 'Rejected' },
  ],
  LabApproved: [
    { action: 'archive', roles: ['LAB_MANAGER', 'ADMIN'], toState: 'Archived' },
    { action: 'reject', roles: ['ADMIN'], toState: 'Rejected' },
  ],
  Archived: [],
  Rejected: [],
}

export function getAllowedActions(
  currentStatus: SamplePickupStatus,
  role: AuthRole
): WorkflowAction[] {
  const transitions = TRANSITIONS[currentStatus] ?? []
  return transitions
    .filter((t) => t.roles.includes(role))
    .map((t) => t.action)
}

export function getNextState(
  currentStatus: SamplePickupStatus,
  action: WorkflowAction,
  role: AuthRole
): SamplePickupStatus | null {
  const transitions = TRANSITIONS[currentStatus] ?? []
  const match = transitions.find((t) => t.action === action && t.roles.includes(role))
  return match?.toState ?? null
}

export function canPerformAction(
  currentStatus: SamplePickupStatus,
  action: WorkflowAction,
  role: AuthRole
): boolean {
  return getNextState(currentStatus, action, role) != null
}
