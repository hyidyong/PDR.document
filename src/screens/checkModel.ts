export type DocumentId = 'plan' | 'contract' | 'receipts'
export type CheckStatus = 'pass' | 'recommend' | 'unverifiable'
export type FindingTone = 'error' | 'evidence' | 'review'
export type Finding = {
  number: number; status: CheckStatus; title: string; location: string; advice: string;
  page?: number; evidencePage?: number; rowNo?: string; tone: FindingTone
}
export type UploadedDocument = { file: File; version: number; status: CheckStatus; source: string; findings: Finding[]; checkedAt: Date; metadata: Record<string, unknown> }
export type DocumentState = Partial<Record<DocumentId, UploadedDocument>>
export type SubmissionStatus = 'draft' | 'submitted' | 'incomplete'
export type FlowOverview = {
  documents: DocumentState
  checkingId: DocumentId | null
  submissionStatus: SubmissionStatus
  submittedAt: Date | null
  reviewRequestedAt: Date | null
  resubmittedAt: Date | null
  isResubmitting: boolean
}
export const emptyFlowOverview: FlowOverview = {
  documents: {}, checkingId: null, submissionStatus: 'draft', submittedAt: null,
  reviewRequestedAt: null, resubmittedAt: null, isResubmitting: false,
}

export const documentLabels: Record<DocumentId, string> = {
  plan: '사업계획서', contract: '물품매매계약서', receipts: '영수증 첨부철',
}

export const documentIds: DocumentId[] = ['plan', 'contract', 'receipts']

export function issueFindings(document?: UploadedDocument) {
  return (document?.findings ?? []).filter((finding) => finding.status !== 'pass')
}

export function documentStatusLabel(document?: UploadedDocument) {
  if (!document) return '미제출'
  if (document.status === 'pass') return '통과'
  const count = issueFindings(document).length
  const label = document.status === 'recommend' ? '오류' : '확인 필요'
  return count > 0 ? `${label} ${count}` : label
}

export function collectIssueFindings(documents: DocumentState) {
  return documentIds.flatMap((id) => issueFindings(documents[id]))
}

export type CheckScreenProps = {
  activeId: DocumentId; documents: DocumentState; checkingId: DocumentId | null; current?: UploadedDocument; passedCount: number;
  onTabChange: (id: DocumentId) => void; onReupload: (id?: DocumentId) => void; onFileSelect: (file: File, id?: DocumentId) => void;
  isResubmitting?: boolean; editableIds?: DocumentId[]; checkRound?: number; checkTime?: string;
}
