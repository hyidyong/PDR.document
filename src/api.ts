import type { CheckStatus, DocumentId, DocumentState, Finding } from './screens/checkModel'
import { supabase } from './supabase'

export const PROJECT_ID = 'modit-2026'
const API_ROOT = import.meta.env.VITE_API_BASE_URL ?? ''

export type Applicant = { id: string; projectId: string; name: string }
export type ProjectView = { id: string; name: string; deadlineAt?: string | null }
export type ApiDocument = { id: string; requirementId: DocumentId; version: number; fileName: string; contentType: string; size: number; uploadedAt: string }
export type ApiInspection = { id: string; documentId: string; requirementId: DocumentId; version: number; status: 'PASS' | 'RECOMMEND' | 'UNVERIFIABLE'; findings: { id: string; message: string }[]; checkedAt: string }
export type ApiFeedback = { comment: string; targetRequirementIds: DocumentId[]; originalVersions: Record<string, number>; createdAt: string }
export type ApiSubmission = { status: string; at: string }
export type CaseView = { status: string; currentDocuments: Partial<Record<DocumentId, ApiDocument>>; currentInspections: Partial<Record<DocumentId, ApiInspection>>; submissions: ApiSubmission[]; feedback: ApiFeedback[] }
export type HistoryView = { inspections: ApiInspection[] }

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new ApiError('로그인이 필요합니다.', 401)
  const response = await fetch(`${API_ROOT}${path}`, { ...init, headers: { Authorization: `Bearer ${session.access_token}`, ...init?.headers } })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(body?.message || `요청을 처리하지 못했습니다. (${response.status})`, response.status)
  }
  return response.json() as Promise<T>
}

const base = `/api/projects/${PROJECT_ID}`
export type LoginResult = { kind: 'applicant'; applicant: Applicant; project: ProjectView } | { kind: 'admin'; project: ProjectView }
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
export const submitCase = (id: string) => request<ApiSubmission>(`${base}/applicants/${id}/submission`, { method: 'POST' })
export const resubmitCase = (id: string) => request<ApiSubmission>(`${base}/applicants/${id}/resubmission`, { method: 'POST' })

function mapFinding(item: { id: string; message: string }, status: CheckStatus): Finding {
  const findingStatus = item.id === '2' ? 'unverifiable' : status
  return { number: Number(item.id) || 1, status: findingStatus, title: item.message, location: '업로드한 서류', advice: '서류 내용을 확인한 후 필요한 부분을 보완해 주세요.' }
}

export function toUploadedDocument(document: ApiDocument, inspection?: ApiInspection) {
  const status = (inspection?.status ?? 'UNVERIFIABLE').toLowerCase() as CheckStatus
  const file = new File([], document.fileName, { type: document.contentType, lastModified: Date.parse(document.uploadedAt) })
  return { file, version: document.version, status, findings: (inspection?.findings ?? []).map((item) => mapFinding(item, status)), checkedAt: new Date(inspection?.checkedAt ?? document.uploadedAt) }
}

export function mapDocuments(documents: Partial<Record<DocumentId, ApiDocument>>, inspections: ApiInspection[]): DocumentState {
  const result: DocumentState = {}
  for (const id of ['plan', 'contract', 'receipts'] as DocumentId[]) {
    const document = documents[id]
    if (document) result[id] = toUploadedDocument(document, inspections.filter((item) => item.documentId === document.id).at(-1))
  }
  return result
}
