// 신청자 알림 벨: built from data the applicant screens already use (existing APIs, no new endpoint):
// GET /applicants/me, /applicants/{id}/submission (status, AI 점검 결과, 보완 요청, 승인) and /projects/{id} (마감).
// Every AppHeader instance asks, so one request is shared and kept for a short time.
import { getCase, getCurrentApplicant, getProject } from '../api'
import type { CaseView } from '../api'
import type { DocumentId } from '../screens/checkModel'
import { documentLabels } from '../screens/checkModel'
import { getSessionUser } from './sessionStore'

export type ApplicantNotice = { key: string; at: string; text: string; tone: 'error' | 'brand' | 'navy' | 'muted' }

const CACHE_MS = 15_000
const DEADLINE_SOON_DAYS = 3
const READ_KEY = 'modit.applicant.noticesRead'
// The backend also sends approval (승인); src/api.ts's CaseView type does not list it yet.
type CaseWithApproval = CaseView & { approval?: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; decidedAt?: string | null } | null }

// Keyed by the signed-in email so another account never sees the previous one's notices.
let cached: { email: string; at: number; notices: Promise<ApplicantNotice[]> } | null = null

const label = (id: string) => documentLabels[id as DocumentId] ?? id
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

export function buildApplicantNotices(view: CaseWithApproval, deadlineAt: string | null | undefined, now = new Date()): ApplicantNotice[] {
  const notices: ApplicantNotice[] = []
  for (const feedback of view.feedback) {
    notices.push({ key: `revision-${feedback.createdAt}`, at: feedback.createdAt, tone: 'error', text: `보완 요청을 받았어요 · ${feedback.targetRequirementIds.map(label).join(', ') || '서류'}` })
  }
  if (view.approval?.status === 'APPROVED') {
    const at = view.approval.decidedAt ?? view.submissions.at(-1)?.at ?? now.toISOString()
    notices.push({ key: `approved-${at}`, at, tone: 'navy', text: '제출한 서류가 승인됐어요' })
  }
  for (const [id, inspection] of Object.entries(view.currentInspections)) {
    if (!inspection || inspection.status === 'PASS') continue
    // Same rule as src/api.ts mapFinding: finding "2" and UNVERIFIABLE results are 확인 필요, the rest 오류.
    const issues = inspection.findings.filter((finding) => !(inspection.source === 'OPENAI_RULES' && finding.kind === 'info'))
    const review = issues.filter((finding) => finding.kind === 'review' || (inspection.source === 'MOCK' && finding.id === '2') || inspection.status === 'UNVERIFIABLE').length
    const error = issues.length - review
    const counts = [error && `오류 ${error}`, review && `확인 필요 ${review}`].filter(Boolean).join(' · ')
    notices.push({ key: `ai-${inspection.id}`, at: inspection.checkedAt, tone: error ? 'error' : 'brand', text: `${label(id)} AI 점검 결과 · ${counts || '확인 필요'}` })
  }
  const open = view.status === 'DRAFT' || view.status === 'NEEDS_REVISION'
  if (deadlineAt && open) {
    const deadline = new Date(deadlineAt)
    const days = Math.round((startOfDay(deadline) - startOfDay(now)) / 86_400_000)
    if (days >= 0 && days <= DEADLINE_SOON_DAYS) {
      notices.push({ key: `deadline-${deadlineAt}-${days}`, at: new Date(startOfDay(now)).toISOString(), tone: 'error', text: `마감 ${days === 0 ? '오늘' : `D-${days}`} · ${deadline.getMonth() + 1}월 ${deadline.getDate()}일까지 제출해 주세요` })
    }
  }
  return notices.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

/** The signed-in 신청자's notices; an empty list when signed out or the server cannot be reached. */
export function loadApplicantNotices(force = false): Promise<ApplicantNotice[]> {
  const email = getSessionUser()?.email ?? ''
  if (!force && cached && cached.email === email && Date.now() - cached.at < CACHE_MS) return cached.notices
  const notices = (async () => {
    const applicant = await getCurrentApplicant()
    const [view, project] = await Promise.all([getCase(applicant.id), getProject()])
    return buildApplicantNotices(view as CaseWithApproval, project.deadlineAt)
  })().catch((error) => { console.warn('[알림] 신청 정보를 불러오지 못했어요', error); return [] })
  cached = { email, at: Date.now(), notices }
  return notices
}

/** Fired after the 알림 are marked read, so every AppHeader bell (some screens stay mounted while hidden) updates its dot. */
export const NOTICES_READ_EVENT = 'modit:applicant-notices-read'

export function readNoticeKeys(): Set<string> {
  try { return new Set(JSON.parse(window.localStorage.getItem(READ_KEY) ?? '[]') as string[]) }
  catch { return new Set() }
}

/** Opening the bell marks the listed notices read (kept in this browser). */
export function markNoticesRead(notices: ApplicantNotice[]) {
  const read = readNoticeKeys()
  notices.forEach((notice) => read.add(notice.key))
  try { window.localStorage.setItem(READ_KEY, JSON.stringify([...read])) } catch { /* read state stays for this view only */ }
  window.dispatchEvent(new Event(NOTICES_READ_EVENT))
}
