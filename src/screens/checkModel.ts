export type DocumentId = 'plan' | 'contract' | 'receipts'
export type CheckStatus = 'pass' | 'recommend' | 'unverifiable'
export type Finding = { number: number; status: CheckStatus; title: string; location: string; advice: string }
export type UploadedDocument = { file: File; version: number; status: CheckStatus; findings: Finding[]; checkedAt: Date }
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

export type CheckScreenProps = {
  activeId: DocumentId; documents: DocumentState; checkingId: DocumentId | null; current?: UploadedDocument; passedCount: number;
  onTabChange: (id: DocumentId) => void; onReupload: (id?: DocumentId) => void; onFileSelect: (file: File, id?: DocumentId) => void;
  isResubmitting?: boolean; editableIds?: DocumentId[]; checkRound?: number; checkTime?: string;
}
