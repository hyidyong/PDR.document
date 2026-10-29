// Data access for the admin (담당자) screens.
// Every function returns a Promise so the bodies can later be swapped for fetch calls
// without touching the screens. For now they read and write a mock state kept in localStorage.
import { adminProject, clubNames, getIssues, mockApplicants, seedEvents, toLocalIso } from '../admin/mockAdminData'
import type { AdminApplicant, AdminEvent, AdminIssue, AdminStatus } from '../admin/mockAdminData'

export type AdminProject = typeof adminProject
/** What D6·D9 show about an applicant's 제출 서류. */
export type ApplicantDocuments = { clubName: string; issues: AdminIssue[] }
export type AdminChange ={ applicant: AdminApplicant; events: AdminEvent[] }
export type RevisionInput = { comment: string; attachAi: boolean }

type AdminState = {
  applicants: AdminApplicant[]
  events: Record<string, AdminEvent[]>
  // Status before 승인, so 승인 취소 can restore it.
  previousStatus: Record<string, AdminStatus>
}

const STORAGE_KEY = 'modit.admin.v1'
// Used by 승인 취소 for applicants that were already approved in the mock data.
const FALLBACK_PREVIOUS_STATUS: AdminStatus = 'SUBMITTED'

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const now = () => toLocalIso(new Date())

function seed(): AdminState {
  return {
    applicants: copy(mockApplicants),
    events: Object.fromEntries(mockApplicants.map((applicant) => [applicant.applicantId, seedEvents(applicant)])),
    previousStatus: {},
  }
}

function isState(value: unknown): value is AdminState {
  if (!value || typeof value !== 'object') return false
  const { applicants, events, previousStatus } = value as Partial<AdminState>
  return Array.isArray(applicants) && applicants.length > 0 && typeof events === 'object' && events !== null && typeof previousStatus === 'object' && previousStatus !== null
    && applicants.every((applicant) => typeof applicant?.applicantId === 'string' && Array.isArray(events[applicant.applicantId]))
}

// Falls back to the mock data when storage is empty, corrupt, or blocked (e.g. private mode).
function load(): AdminState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isState(parsed)) return parsed
    }
  } catch {
    // Ignore and start from the mock data.
  }
  return seed()
}

function save() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Changes still apply for this session; they just won't survive a reload.
  }
}

let state = load()

function find(applicantId: string) {
  const applicant = state.applicants.find((item) => item.applicantId === applicantId)
  if (!applicant) throw new Error(`신청자를 찾을 수 없어요: ${applicantId}`)
  return applicant
}

function change(applicant: AdminApplicant, status: AdminStatus, event: AdminEvent): AdminChange {
  applicant.status = status
  state.events[applicant.applicantId] = [...(state.events[applicant.applicantId] ?? []), event]
  save()
  return copy({ applicant, events: state.events[applicant.applicantId] })
}

export async function getProject(): Promise<AdminProject> {
  return adminProject
}

export async function getApplicants(): Promise<AdminApplicant[]> {
  return copy(state.applicants)
}

export async function getApplicant(applicantId: string): Promise<AdminApplicant | null> {
  const applicant = state.applicants.find((item) => item.applicantId === applicantId)
  return applicant ? copy(applicant) : null
}

export async function getEvents(applicantId: string): Promise<AdminEvent[]> {
  return copy(state.events[applicantId] ?? [])
}

export async function getApplicantDocuments(applicantId: string): Promise<ApplicantDocuments> {
  const applicant = find(applicantId)
  return { clubName: clubNames[applicantId] ?? '', issues: getIssues(applicant) }
}

/** 진행 이력 for every applicant, keyed by applicantId. */
export async function getAllEvents(): Promise<Record<string, AdminEvent[]>> {
  return copy(state.events)
}

/** 보완 요청: saves the comment and moves the applicant to 보완 필요. */
export async function requestRevision(applicantId: string, { comment, attachAi }: RevisionInput): Promise<AdminChange> {
  const applicant = find(applicantId)
  return change(applicant, 'NEEDS_REVISION', { kind: 'revision', at: now(), label: '보완 요청', tone: 'error', comment, attachAi })
}

/** 승인: remembers the current status so it can be restored by cancelApproval. */
export async function approve(applicantId: string): Promise<AdminChange> {
  const applicant = find(applicantId)
  if (applicant.status === 'APPROVED') return copy({ applicant, events: state.events[applicantId] ?? [] })
  state.previousStatus[applicantId] = applicant.status
  return change(applicant, 'APPROVED', { kind: 'approved', at: now(), label: '승인 완료', tone: 'navy' })
}

/** 승인 취소: returns the applicant to the status they had before 승인. */
export async function cancelApproval(applicantId: string): Promise<AdminChange> {
  const applicant = find(applicantId)
  if (applicant.status !== 'APPROVED') return copy({ applicant, events: state.events[applicantId] ?? [] })
  const previous = state.previousStatus[applicantId] ?? FALLBACK_PREVIOUS_STATUS
  delete state.previousStatus[applicantId]
  return change(applicant, previous, { kind: 'approval-cancelled', at: now(), label: '승인 취소', tone: 'muted' })
}

/**
 * ZIP 다운로드 of the given applicants' 제출 서류, one folder per applicant.
 * The demo has no real files, so it always reports that nothing was downloaded.
 */
export async function downloadDocumentsZip(applicantIds: string[]): Promise<{ downloaded: boolean }> {
  applicantIds.forEach(find)
  return { downloaded: false }
}

/** Restores the 시연 데이터 to its starting state. */
export async function resetDemo(): Promise<void> {
  state = seed()
  save()
}
