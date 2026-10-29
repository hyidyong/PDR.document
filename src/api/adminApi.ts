// Data access for the admin (담당자) screens.
// Every function returns a Promise so the bodies can later be swapped for fetch calls
// without touching the screens. For now they read and write a mock state kept in localStorage.
import { ApiError, getProject as fetchProject, PROJECT_ID } from '../api'
import type { ProjectView } from '../api'
import { adminProject, clubNames, getIssues, mockApplicants, seedEvents, toLocalIso } from '../admin/mockAdminData'
import type { AdminApplicant, AdminEvent, AdminIssue, AdminStatus, RosterRow } from '../admin/mockAdminData'
import { DEFAULT_PROJECT_DEADLINE } from '../utils/projectDeadline'

// The server's ProjectView plus two fields only the admin screens use so far.
export type AdminProject = ProjectView & { linkSharedAt: string; zipFileName: string }
/** What D6·D9 show about an applicant's 제출 서류. */
export type ApplicantDocuments = { clubName: string; issues: AdminIssue[] }
export type AdminChange ={ applicant: AdminApplicant; events: AdminEvent[] }
export type RevisionInput = { comment: string; attachAi: boolean }
/** 새 프로젝트 만들기 (D2~D4 마법사) 결과. Only the 담당자 screens use it; there is no 신청자 side yet. */
export type NewProjectDocument = { name: string; required: boolean; formFileName: string | null; note: string }
// roster: the registered 명단 rows (empty for 새로 받기). Optional so projects saved before it still load.
export type NewProjectInput = { name: string; org: string; deadlineAt: string; slug: string; rosterCount: number; rosterMode: 'list' | 'link'; roster?: RosterRow[]; guide: string; documents: NewProjectDocument[] }
export type CreatedProject = NewProjectInput & { id: string; createdAt: string }

type AdminState = {
  applicants: AdminApplicant[]
  events: Record<string, AdminEvent[]>
  // Status before 승인, so 승인 취소 can restore it.
  previousStatus: Record<string, AdminStatus>
  // Made with 새 프로젝트 만들기. Optional so state saved before this field still loads.
  createdProjects?: CreatedProject[]
  // 알림 벨: events after this time are unread. null until the bell is first opened. Optional for older saved state.
  notificationsReadAt?: string | null
}

const STORAGE_KEY = 'modit.admin.v1'
// Used by 승인 취소 for applicants that were already approved in the mock data.
const FALLBACK_PREVIOUS_STATUS: AdminStatus = 'SUBMITTED'

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
// Local time down to the millisecond, so an event and the 알림 읽음 time in the same minute still compare correctly.
const now = () => { const date = new Date(); return `${toLocalIso(date)}:${String(date.getSeconds()).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}` }

function seed(): AdminState {
  return {
    applicants: copy(mockApplicants),
    events: Object.fromEntries(mockApplicants.map((applicant) => [applicant.applicantId, seedEvents(applicant)])),
    previousStatus: {},
    createdProjects: [],
    notificationsReadAt: null,
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

/** Uses the server project (name, deadlineAt) when signed in; 담당자 데모 without a login falls back to the mock. */
export async function getProject(): Promise<AdminProject> {
  const mock: AdminProject = { id: PROJECT_ID, name: adminProject.name, deadlineAt: DEFAULT_PROJECT_DEADLINE, linkSharedAt: adminProject.linkSharedAt, zipFileName: adminProject.zipFileName }
  try {
    const project = await fetchProject()
    return { ...mock, ...project, deadlineAt: project.deadlineAt ?? mock.deadlineAt }
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) console.warn('프로젝트 정보를 불러오지 못해 시연 데이터를 써요.', error)
    return mock
  }
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

/** Projects made with 새 프로젝트 만들기, oldest first. */
export async function getCreatedProjects(): Promise<CreatedProject[]> {
  return copy(state.createdProjects ?? [])
}

/** 새 프로젝트 만들기: saves the project in the mock state (D1 lists it). Slugs are unique, like a real link would be. */
export async function createProject(input: NewProjectInput): Promise<CreatedProject> {
  const projects = state.createdProjects ?? []
  if (input.slug === 'startup-2026' || projects.some((project) => project.slug === input.slug)) throw new Error('이미 쓰고 있는 링크 주소예요. 다른 주소를 입력해 주세요.')
  const project: CreatedProject = { ...copy(input), id: `project-${Date.now()}`, createdAt: now() }
  state.createdProjects = [...projects, project]
  save()
  return copy(project)
}

/** 알림 벨: when the 담당자 last opened it (null = never, so every 알림 is unread). */
export async function getNotificationsReadAt(): Promise<string | null> {
  return state.notificationsReadAt ?? null
}

/** Opening the 알림 marks everything up to now as read. */
export async function markNotificationsRead(): Promise<string> {
  state.notificationsReadAt = now()
  save()
  return state.notificationsReadAt
}

/** Restores the 시연 데이터 to its starting state. */
export async function resetDemo(): Promise<void> {
  state = seed()
  save()
}
