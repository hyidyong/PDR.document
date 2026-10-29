import type { CheckStatus, DocumentId, DocumentState, Finding } from './screens/checkModel'
import { supabase } from './supabase'
import { createSessionAccess, SessionAccessError } from './auth/sessionAccess'

export const PROJECT_ID = 'modit-2026'
const API_ROOT = import.meta.env.VITE_API_BASE_URL ?? ''

export type Applicant = { id: string; projectId: string; name: string }
export type ProjectView = { id: string; name: string; deadlineAt?: string | null }
export type ApiDocument = { id: string; requirementId: DocumentId; version: number; fileName: string; contentType: string; size: number; uploadedAt: string }
export type ApiInspectionFinding = { id: string; message: string; kind?: string | null; page?: number | null; evidencePage?: number | null; rowNo?: string | null; expected?: unknown; actual?: unknown; source?: string | null }
export type ApiInspection = { id: string; documentId: string; requirementId: DocumentId; version: number; status: 'PASS' | 'RECOMMEND' | 'UNVERIFIABLE'; source: string; findings: ApiInspectionFinding[]; checkedAt: string; metadata?: Record<string, unknown> }
export type ApiFeedback = { comment: string; targetRequirementIds: DocumentId[]; originalVersions: Record<string, number>; createdAt: string }
export type ApiSubmission = { status: string; at: string }
export type CaseView = { status: string; currentDocuments: Partial<Record<DocumentId, ApiDocument>>; currentInspections: Partial<Record<DocumentId, ApiInspection>>; submissions: ApiSubmission[]; feedback: ApiFeedback[] }
export type HistoryView = { inspections: ApiInspection[] }
export type ChecklistRequest = {
  documentType?: string; programName?: string; institution?: string; deadline?: string;
  officialInstructions?: string; userContext?: string
}
export type ChecklistItem = {
  title: string; requirement: string; issuer: string | null; howToObtain: string | null;
  estimatedTime: string | null; deadline: string | null; filenameRule: string | null;
  sourceUrl: string | null; sourceType: string; verification: string; evidence: string; notes: string
}
export type ChecklistResponse = {
  schema_version: '2.0'; programName: string; documentType: string; deadline: string | null;
  filenameRule: string | null; items: ChecklistItem[]; questions: string[]; webSearchUsed: boolean;
  sourceVerification: string; disclaimer: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

type AccessToken = (forceRefresh?: boolean) => Promise<string>
const sessionGlobal = globalThis as typeof globalThis & {
  __moditAccessToken?: AccessToken
  __moditLocalSessionRecovery?: Promise<void>
}
const accessToken = sessionGlobal.__moditAccessToken ??= createSessionAccess(supabase.auth)
const fatalRefreshCodes = new Set(['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired'])

async function authenticatedToken(): Promise<string> {
  try { return await accessToken() }
  catch (error) {
    if (error instanceof SessionAccessError && fatalRefreshCodes.has(error.code)) {
      sessionGlobal.__moditLocalSessionRecovery ??= supabase.auth.signOut({ scope: 'local' }).then(() => undefined)
      await sessionGlobal.__moditLocalSessionRecovery
    }
    throw error
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await authenticatedToken()
  const response = await fetch(`${API_ROOT}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init?.headers } })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(body?.message || `요청을 처리하지 못했습니다. (${response.status})`, response.status)
  }
  return response.json() as Promise<T>
}

const base = `/api/projects/${PROJECT_ID}`
export type LoginResult = { kind: 'applicant'; applicant: Applicant; project: ProjectView } | { kind: 'admin'; project: ProjectView }
export async function resolveCurrentSession(): Promise<LoginResult | null> {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session?.user) return null
  const project = await request<ProjectView>(base)
  if (session.user.app_metadata?.role === 'admin') return { kind: 'admin', project }
  return { kind: 'applicant', applicant: await request<Applicant>(`${base}/applicants/me`), project }
}
export async function signInAndResolveUser(email: string, password: string): Promise<LoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new ApiError('이메일 또는 비밀번호를 확인해 주세요.', 401)
  try {
    const project = await request<ProjectView>(base)
    if (data.user.app_metadata?.role === 'admin') return { kind: 'admin', project }
    return { kind: 'applicant', applicant: await request<Applicant>(`${base}/applicants/me`), project }
  }
  catch (error) { await supabase.auth.signOut(); throw error }
}
export const signOut = () => supabase.auth.signOut()
export const getProject = () => request<ProjectView>(base)
export const getCase = (id: string) => request<CaseView>(`${base}/applicants/${id}/submission`)
export const getHistory = (id: string) => request<HistoryView>(`${base}/applicants/${id}/history`)
export const getDocuments = (id: string) => request<Partial<Record<DocumentId, ApiDocument[]>>>(`${base}/applicants/${id}/documents`)
export const uploadDocument = (id: string, requirementId: DocumentId, file: File) => { const body = new FormData(); body.append('file', file); return request<ApiDocument>(`${base}/applicants/${id}/documents/${requirementId}`, { method: 'POST', body }) }
export const inspectDocument = (id: string, requirementId: DocumentId) => request<ApiInspection>(`${base}/applicants/${id}/documents/${requirementId}/inspections`, { method: 'POST' })
export const generateDocumentChecklist = (payload: ChecklistRequest) =>
  request<ChecklistResponse>('/api/ai/document-checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export async function downloadDocument(id: string, document: ApiDocument): Promise<File> {
  const token = await authenticatedToken()
  const response = await fetch(`${API_ROOT}${base}/applicants/${id}/documents/${document.requirementId}/versions/${document.version}/file`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new ApiError(`PDF를 불러오지 못했습니다. (${response.status})`, response.status)
  const blob = await response.blob()
  return new File([blob], document.fileName, { type: document.contentType || blob.type || 'application/pdf', lastModified: Date.parse(document.uploadedAt) })
}
export const submitCase = (id: string) => request<ApiSubmission>(`${base}/applicants/${id}/submission`, { method: 'POST' })
export const resubmitCase = (id: string) => request<ApiSubmission>(`${base}/applicants/${id}/resubmission`, { method: 'POST' })

function mapFinding(item: ApiInspectionFinding, status: CheckStatus, index: number, source: string): Finding {
  const findingStatus = source === 'OPENAI_RULES' && item.kind === 'info' ? 'pass'
    : item.kind === 'review' || (source === 'MOCK' && item.id === '2') ? 'unverifiable' : status
  const actual = source !== 'MOCK'
  const pages = [item.page && `지출표 ${item.page}쪽`, item.evidencePage && `증빙 ${item.evidencePage}쪽`, item.rowNo && `${item.rowNo}번 항목`].filter(Boolean).join(' · ')
  const tone = item.evidencePage ? 'evidence' : findingStatus === 'recommend' ? 'error' : 'review'
  return {
    number: Number(item.id) || index + 1, status: findingStatus, title: item.message,
    location: pages || (actual ? `검수 규칙 ${item.id}` : '업로드한 서류'),
    advice: actual ? '원본 PDF와 추출 결과를 확인한 뒤 필요한 항목을 보완해 주세요.' : '서류 내용을 확인한 후 필요한 부분을 보완해 주세요.',
    page: item.page ?? undefined, evidencePage: item.evidencePage ?? undefined,
    rowNo: item.rowNo ?? undefined, tone,
  }
}

export function toUploadedDocument(document: ApiDocument, inspection?: ApiInspection) {
  const status = (inspection?.status ?? 'UNVERIFIABLE').toLowerCase() as CheckStatus
  const file = new File([], document.fileName, { type: document.contentType, lastModified: Date.parse(document.uploadedAt) })
  const source = inspection?.source ?? 'NOT_ANALYZED'
  return { file, version: document.version, status, source, findings: (inspection?.findings ?? []).map((item, index) => mapFinding(item, status, index, source)), checkedAt: new Date(inspection?.checkedAt ?? document.uploadedAt), metadata: inspection?.metadata ?? {} }
}

export function mapDocuments(documents: Partial<Record<DocumentId, ApiDocument>>, inspections: ApiInspection[]): DocumentState {
  const result: DocumentState = {}
  for (const id of ['plan', 'contract', 'receipts'] as DocumentId[]) {
    const document = documents[id]
    if (document) result[id] = toUploadedDocument(document, inspections.filter((item) => item.documentId === document.id).at(-1))
  }
  return result
}
