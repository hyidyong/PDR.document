// Mock data for the admin (담당자) screens. These are not server data.
import type { Status } from '../components/common'

export type AdminStatus = 'DRAFT' | 'SUBMITTED' | 'SUBMITTED_INCOMPLETE' | 'NEEDS_REVISION' | 'REVIEW_PENDING' | 'APPROVED'

export type AdminApplicant = {
  applicantId: string
  name: string
  studentId: string
  status: AdminStatus
  aiSummary: { error: number; review: number }
  lastSubmittedAt: string | null
}

export type AdminEventKind = 'link' | 'ai' | 'submit' | 'revision' | 'resubmit' | 'approved'
export type AdminEvent = { kind: AdminEventKind; at: string; label: string; tone: 'muted' | 'error' | 'navy' | 'brand'; comment?: string }

export const adminProject = {
  name: '2026 창업동아리 지원사업 정산',
  deadlineBadge: '마감 10월 31일 · D-3',
  linkSharedAt: '2026-10-24T09:10',
} as const

export const adminStatusOrder: AdminStatus[] = ['DRAFT', 'SUBMITTED', 'SUBMITTED_INCOMPLETE', 'NEEDS_REVISION', 'REVIEW_PENDING', 'APPROVED']

export const adminStatusLabels: Record<AdminStatus, string> = {
  DRAFT: '미제출',
  SUBMITTED: '제출',
  SUBMITTED_INCOMPLETE: '제출(미비)',
  NEEDS_REVISION: '보완 필요',
  REVIEW_PENDING: '재제출',
  APPROVED: '승인',
}

// Maps admin statuses onto the shared StatusBadge variants.
export const adminStatusBadge: Record<AdminStatus, Status> = {
  DRAFT: 'not-submitted',
  SUBMITTED: 'submitted',
  SUBMITTED_INCOMPLETE: 'incomplete',
  NEEDS_REVISION: 'needs-review',
  REVIEW_PENDING: 'resubmit',
  APPROVED: 'approved',
}

type Row = [name: string, studentId: string, status: AdminStatus, error: number, review: number, lastSubmittedAt: string | null, clubName: string]

// The first ten rows follow the D5 design.
const rows: Row[] = [
  ['김청년', '20231234', 'SUBMITTED_INCOMPLETE', 1, 1, '2026-10-28T15:20', '스타트온'],
  ['이서연', '20221045', 'SUBMITTED', 0, 0, '2026-10-28T13:52', '그린루프'],
  ['정민호', '20231187', 'REVIEW_PENDING', 0, 1, '2026-10-28T11:05', '캠퍼스랩'],
  ['최유진', '20221302', 'APPROVED', 0, 0, '2026-10-27T17:48', '플랜비'],
  ['한도윤', '20231456', 'SUBMITTED_INCOMPLETE', 2, 0, '2026-10-27T16:10', '메이커스'],
  ['오지민', '20221578', 'NEEDS_REVISION', 1, 0, '2026-10-26T14:33', '온새미로'],
  ['윤하늘', '20231602', 'SUBMITTED', 0, 0, '2026-10-26T10:12', '하늘정원'],
  ['강민재', '20221699', 'APPROVED', 0, 0, '2026-10-25T18:40', '코드브루'],
  ['서다은', '20231711', 'SUBMITTED', 0, 1, '2026-10-25T09:27', '다온'],
  ['임재현', '20221823', 'DRAFT', 0, 0, null, '리프트업'],
  ['배수아', '20221934', 'SUBMITTED', 0, 0, '2026-10-24T21:05', '수아랩'],
  ['조현우', '20231966', 'SUBMITTED_INCOMPLETE', 1, 0, '2026-10-24T18:22', '모먼트'],
  ['신예린', '20222011', 'APPROVED', 0, 0, '2026-10-24T15:47', '예린스튜디오'],
  ['권태양', '20232045', 'SUBMITTED', 0, 1, '2026-10-24T11:30', '선라이즈'],
  ['황보람', '20222087', 'NEEDS_REVISION', 1, 1, '2026-10-23T19:12', '보람찬'],
  ['안소희', '20232103', 'SUBMITTED', 0, 0, '2026-10-23T16:05', '소소한'],
  ['송지후', '20222156', 'REVIEW_PENDING', 0, 0, '2026-10-23T13:40', '지구별'],
  ['류하은', '20232198', 'SUBMITTED', 0, 0, '2026-10-23T10:18', '하은테크'],
  ['전우진', '20222231', 'SUBMITTED_INCOMPLETE', 1, 1, '2026-10-22T20:55', '우진랩스'],
  ['홍채원', '20232264', 'APPROVED', 0, 0, '2026-10-22T17:33', '채움'],
  ['고준서', '20222305', 'NEEDS_REVISION', 2, 0, '2026-10-22T14:08', '준서컴퍼니'],
  ['남궁별', '20232347', 'SUBMITTED', 0, 0, '2026-10-22T09:45', '별빛'],
  ['백시우', '20222390', 'SUBMITTED', 0, 0, '2026-10-21T16:20', '시우랩'],
  ['유가온', '20232412', 'DRAFT', 0, 0, null, '가온누리'],
  ['차민석', '20222456', 'DRAFT', 0, 0, null, '스텝업'],
  ['노은채', '20232489', 'DRAFT', 0, 0, null, '은하수'],
  ['하준혁', '20222513', 'DRAFT', 0, 0, null, '넥스트'],
  ['구서윤', '20232547', 'DRAFT', 0, 0, null, '윤슬'],
  ['마태호', '20222580', 'DRAFT', 0, 0, null, '태호상회'],
  ['염다인', '20232611', 'DRAFT', 0, 0, null, '다인다색'],
]

const toId = (index: number) => `A${String(index + 1).padStart(3, '0')}`

export const mockApplicants: AdminApplicant[] = rows.map(([name, studentId, status, error, review, lastSubmittedAt], index) => ({
  applicantId: toId(index),
  name,
  studentId,
  status,
  aiSummary: { error, review },
  lastSubmittedAt,
}))

export const clubNames: Record<string, string> = Object.fromEntries(rows.map((row, index) => [toId(index), row[6]]))

export const adminDocuments = ['사업계획서', '물품매매계약서', '영수증 첨부철'] as const
export type AdminDocument = typeof adminDocuments[number]

// target marks where the issue is drawn on the 물품매매계약서 preview.
export type AdminIssue = { number: number; kind: 'error' | 'review'; title: string; location: string; document: AdminDocument; target: 'signature' | 'amount' | null }

const errorIssues: Omit<AdminIssue, 'number' | 'kind'>[] = [
  { title: '매수인 서명·날인 누락', location: '물품매매계약서 1페이지 하단 매수인 칸', document: '물품매매계약서', target: 'signature' },
  { title: '영수증 사용일 순서가 뒤바뀜', location: '영수증 첨부철 3–4페이지', document: '영수증 첨부철', target: null },
]
const reviewIssues: Omit<AdminIssue, 'number' | 'kind'>[] = [
  { title: '계약 금액 1,350,000원 ↔ 영수증 합계 1,320,000원 불일치', location: '물품매매계약서 · 영수증 첨부철 비교', document: '영수증 첨부철', target: 'amount' },
  { title: '사업계획서 대표자 서명 확인 필요', location: '사업계획서 마지막 페이지', document: '사업계획서', target: null },
]

export function getIssues({ aiSummary }: AdminApplicant): AdminIssue[] {
  const errors = errorIssues.slice(0, aiSummary.error).map((issue) => ({ ...issue, kind: 'error' as const }))
  const reviews = reviewIssues.slice(0, aiSummary.review).map((issue) => ({ ...issue, kind: 'review' as const }))
  return [...errors, ...reviews].map((issue, index) => ({ ...issue, number: index + 1 }))
}

const pad = (value: number) => String(value).padStart(2, '0')
export const toLocalIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
const shift = (iso: string, minutes: number) => toLocalIso(new Date(new Date(iso).getTime() + minutes * 60_000))

/** "10.28 15:20" */
export const formatShort = (iso: string) => { const date = new Date(iso); return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}` }
/** "10월 28일 15:20" */
export const formatLong = (iso: string) => { const date = new Date(iso); return `${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}` }
/** "10월 28일" */
export const formatDay = (iso: string) => { const date = new Date(iso); return `${date.getMonth() + 1}월 ${date.getDate()}일` }

function aiLabel({ error, review }: AdminApplicant['aiSummary']) {
  if (!error && !review) return 'AI 점검 · 모두 통과'
  return `AI 점검 2회차 · ${[error && `오류 ${error}`, review && `확인 ${review}`].filter(Boolean).join(', ')}`
}

// Builds the starting 진행 이력 for an applicant from their mock status.
export function seedEvents(applicant: AdminApplicant): AdminEvent[] {
  const events: AdminEvent[] = [{ kind: 'link', at: adminProject.linkSharedAt, label: '제출 링크 공유', tone: 'muted' }]
  const at = applicant.lastSubmittedAt
  if (!at) return events
  const hasIssues = applicant.aiSummary.error + applicant.aiSummary.review > 0
  const submitted = (time: string, incomplete: boolean): AdminEvent => incomplete
    ? { kind: 'submit', at: time, label: '제출(미비)', tone: 'error' }
    : { kind: 'submit', at: time, label: '제출', tone: 'navy' }

  if (applicant.status === 'REVIEW_PENDING') {
    const first = shift(at, -3 * 24 * 60)
    events.push(
      { kind: 'ai', at: shift(first, -10), label: 'AI 점검 2회차 · 오류 1', tone: 'muted' },
      submitted(first, true),
      { kind: 'revision', at: shift(first, 24 * 60), label: '보완 요청', tone: 'error' },
      { kind: 'ai', at: shift(at, -5), label: aiLabel(applicant.aiSummary), tone: 'muted' },
      { kind: 'resubmit', at, label: '재제출', tone: 'brand' },
    )
    return events
  }

  events.push({ kind: 'ai', at: shift(at, hasIssues ? -10 : -5), label: aiLabel(applicant.aiSummary), tone: 'muted' })
  events.push(submitted(at, applicant.status === 'SUBMITTED_INCOMPLETE' || (applicant.status === 'NEEDS_REVISION' && hasIssues)))
  if (applicant.status === 'NEEDS_REVISION') events.push({ kind: 'revision', at: shift(at, 120), label: '보완 요청', tone: 'error' })
  if (applicant.status === 'APPROVED') events.push({ kind: 'approved', at: shift(at, 120), label: '승인 완료', tone: 'navy' })
  return events
}
