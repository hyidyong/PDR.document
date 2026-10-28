import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { AppHeader, Button, UploadIcon } from '../components/common'
import type { MainPage } from '../components/common'
import { B2DocumentCheck } from './B2DocumentCheck'
import { B3DocumentCheck } from './B3DocumentCheck'
import { B4SubmissionConfirm } from './B4SubmissionConfirm'
import { B5EmptyInbox, B5SubmissionInbox } from './B5SubmissionInbox'
import { B6ResubmissionConfirm } from './B6ResubmissionConfirm'
import { documentLabels } from './checkModel'
import type { DocumentId, DocumentState, FlowOverview, SubmissionStatus, UploadedDocument } from './checkModel'
import './DocumentCheckFlow.css'

// Demo rules are deliberately deterministic. They do not inspect document contents.
function mockCheck(id: DocumentId, file: File, version: number, previous?: UploadedDocument): UploadedDocument {
  if (previous && previous.file.name === file.name && previous.file.size === file.size) {
    return { ...previous, file, version, checkedAt: new Date() }
  }
  if (version > 1 || id === 'plan') return { file, version, status: 'pass', findings: [], checkedAt: new Date() }
  if (id === 'contract') return {
    file, version, status: 'recommend', checkedAt: new Date(), findings: [
      { number: 1, status: 'recommend', title: '매수인 서명·날인 누락', location: '물품매매계약서 1페이지 하단 매수인 칸', advice: '매수인(동아리 대표) 서명과 날인 후 다시 올려주세요' },
      { number: 2, status: 'unverifiable', title: '계약 금액 1,350,000원 ↔ 영수증 합계 1,320,000원 불일치', location: '서류 간 비교 · 물품매매계약서 ↔ 영수증 첨부철', advice: '차액 30,000원의 영수증이 빠졌는지 확인해주세요' },
    ],
  }
  return {
    file, version, status: 'unverifiable', checkedAt: new Date(), findings: [
      { number: 2, status: 'unverifiable', title: '계약 금액 1,350,000원 ↔ 영수증 합계 1,320,000원 불일치', location: '서류 간 비교 · 영수증 첨부철 합계 1,320,000원 ↔ 물품매매계약서 1,350,000원', advice: '차액 30,000원의 영수증이 빠졌는지 확인해주세요' },
    ],
  }
}

export function DocumentCheckFlow({ page, onNavigate, onLogout, onOverviewChange }: { page: MainPage; onNavigate: (page: MainPage) => void; onLogout: () => void; onOverviewChange: (overview: FlowOverview) => void }) {
  const [activeId, setActiveId] = useState<DocumentId>('contract')
  const [documents, setDocuments] = useState<DocumentState>({})
  const [checkingId, setCheckingId] = useState<DocumentId | null>(null)
  const [fileError, setFileError] = useState('')
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('draft')
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null)
  const [submittedDocuments, setSubmittedDocuments] = useState<DocumentState>({})
  const [originalDocuments, setOriginalDocuments] = useState<DocumentState>({})
  const [reviewRequestedAt, setReviewRequestedAt] = useState<Date | null>(null)
  const [resubmittedAt, setResubmittedAt] = useState<Date | null>(null)
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [showResubmitConfirm, setShowResubmitConfirm] = useState(false)
  const [requestedIds, setRequestedIds] = useState<DocumentId[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<DocumentId | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])
  useEffect(() => {
    onOverviewChange({ documents, checkingId, submissionStatus, submittedAt, reviewRequestedAt, resubmittedAt, isResubmitting })
  }, [documents, checkingId, submissionStatus, submittedAt, reviewRequestedAt, resubmittedAt, isResubmitting, onOverviewChange])

  const selectFile = (file: File, id = activeId) => {
    if (submissionStatus !== 'draft' && !isResubmitting) return
    if (isResubmitting && !requestedIds.includes(id)) return
    setFileError('')
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('PDF 파일을 선택해 주세요.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setFileError('파일 크기는 20MB 이하로 선택해 주세요.')
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    setCheckingId(id)
    const nextVersion = (documents[id]?.version ?? 0) + 1
    timerRef.current = setTimeout(() => {
      setDocuments((current) => ({ ...current, [id]: mockCheck(id, file, nextVersion, isResubmitting ? undefined : current[id]) }))
      setCheckingId(null)
    }, 650)
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) selectFile(file, uploadTargetRef.current ?? activeId)
    uploadTargetRef.current = null
    event.target.value = ''
  }

  const openFilePicker = (id = activeId) => {
    if (submissionStatus !== 'draft' && !isResubmitting) return
    if (isResubmitting && !requestedIds.includes(id)) return
    uploadTargetRef.current = id
    setActiveId(id)
    fileInputRef.current?.click()
  }

  const changeTab = (id: DocumentId) => {
    if (checkingId) return
    setActiveId(id)
    setFileError('')
  }

  const current = documents[activeId]
  const passedCount = (Object.values(documents) as UploadedDocument[]).filter((doc) => doc.status === 'pass').length
  const remaining = Object.values(documents) as UploadedDocument[]
  const issueFindings = [...(documents.contract?.findings ?? []), ...(documents.receipts?.findings ?? [])]
  const errorCount = issueFindings.filter((finding) => finding.status === 'recommend' && finding.number === 1).length
  const reviewCount = issueFindings.some((finding) => finding.number === 2) ? 1 : 0
  const checkRound = remaining.reduce((sum, doc) => sum + doc.version, 0)
  const latestCheck = remaining.reduce<Date | null>((latest, doc) => !latest || doc.checkedAt > latest ? doc.checkedAt : latest, null)
  const checkTime = latestCheck ? `${String(latestCheck.getMonth() + 1).padStart(2, '0')}.${String(latestCheck.getDate()).padStart(2, '0')} ${String(latestCheck.getHours()).padStart(2, '0')}:${String(latestCheck.getMinutes()).padStart(2, '0')}` : ''
  const screenProps = { activeId, documents, checkingId, current, passedCount, onTabChange: changeTab, onReupload: openFilePicker, onFileSelect: selectFile, isResubmitting, editableIds: requestedIds, checkRound, checkTime }

  const confirmSubmission = () => {
    const hasIncompleteDocuments = remaining.length < 3 || remaining.some((document) => document.status !== 'pass')
    setSubmittedDocuments({ ...documents })
    setOriginalDocuments({ ...documents })
    setSubmittedAt(new Date())
    setSubmissionStatus(hasIncompleteDocuments ? 'incomplete' : 'submitted')
    if (new URLSearchParams(window.location.search).get('mockReview') === 'requested' && hasIncompleteDocuments) {
      const targets = (['plan', 'contract', 'receipts'] as DocumentId[]).filter((id) => !documents[id] || documents[id]?.status !== 'pass' || documents[id]?.findings.length)
      setRequestedIds(targets)
      setReviewRequestedAt(new Date())
    }
    setShowSubmitConfirm(false)
    onNavigate('inbox')
  }

  const startResubmission = () => {
    setDocuments({ ...submittedDocuments })
    setActiveId(requestedIds[0] ?? 'contract')
    setIsResubmitting(true)
    setFileError('')
    onNavigate('check')
  }

  const confirmResubmission = () => {
    setSubmittedDocuments({ ...documents })
    setResubmittedAt(new Date())
    setShowResubmitConfirm(false)
    setIsResubmitting(false)
    onNavigate('inbox')
  }

  const requestedDocumentsReady = requestedIds.length > 0 && requestedIds.every((id) => documents[id] && documents[id].version > (originalDocuments[id]?.version ?? 0) && documents[id].status === 'pass')
  const allDocumentsPassed = remaining.length === 3 && remaining.every((document) => document.status === 'pass')

  if (page === 'inbox') {
    if (submissionStatus === 'draft' || !submittedAt) return <B5EmptyInbox onNavigate={onNavigate} onLogout={onLogout} />
    return <B5SubmissionInbox documents={submittedDocuments} originalDocuments={originalDocuments} status={submissionStatus} submittedAt={submittedAt} reviewRequestedAt={reviewRequestedAt} resubmittedAt={resubmittedAt} requestedIds={requestedIds} onResubmit={reviewRequestedAt && !resubmittedAt ? startResubmission : undefined} onNavigate={onNavigate} onLogout={onLogout} />
  }

  return <div className="check-flow">
    <AppHeader activePage="check" onNavigate={onNavigate} onLogout={onLogout} />
    <main className="check-main">
      <div className="check-page-heading"><div className="check-breadcrumb">한국대학교 창업지원단 <span>›</span> 2026 창업동아리 지원사업 정산</div><div className="check-title-row"><h1>제출 서류 점검</h1><span className="check-deadline">마감 D-3</span><span className="check-round">점검 {checkRound}회차{checkTime && ` · ${checkTime}`}</span></div></div>
      {isResubmitting && <div className="check-resubmission-note"><strong>보완 요청 서류를 수정하고 있어요</strong><span>교체 대상: {requestedIds.map((id) => documentLabels[id]).join(', ')} · 이전 제출 파일과 검사 결과는 기록으로 보관돼요.</span></div>}
      {activeId === 'receipts' ? <B3DocumentCheck {...screenProps} /> : <B2DocumentCheck {...screenProps} />}
    </main>
    <div className="check-actionbar"><div className="check-actionbar__inner"><span className="check-action-note">{submissionStatus !== 'draft' && !isResubmitting ? '제출한 서류는 내 제출함에서 확인할 수 있어요.' : isResubmitting ? allDocumentsPassed ? '모든 항목을 확인했어요. 담당자에게 다시 제출할 수 있어요.' : checkingId ? 'AI 검사 중이에요.' : '보완 요청 서류를 교체하고 AI 검사를 확인해 주세요.' : errorCount || reviewCount ? `오류 ${errorCount}건, 확인 필요 ${reviewCount}건이 남아 있어요` : '파일을 올리면 AI 검사가 자동으로 시작돼요'}</span><div className="check-action-buttons"><Button disabled={(submissionStatus !== 'draft' && !isResubmitting) || (isResubmitting && !requestedIds.includes(activeId))} variant="secondary" onClick={() => openFilePicker()}><UploadIcon width={16} height={16} /> {isResubmitting || activeId === 'contract' ? '수정본 올리기' : '수정본 다시 올리기'}</Button><Button disabled={(submissionStatus !== 'draft' && !isResubmitting) || checkingId !== null || (isResubmitting && (!requestedDocumentsReady || !allDocumentsPassed))} onClick={() => isResubmitting ? setShowResubmitConfirm(true) : setShowSubmitConfirm(true)}>{isResubmitting ? '재제출하기' : '제출하기'}</Button></div></div></div>
    <input aria-label={`${documentLabels[activeId]} 파일 선택`} accept=".pdf,application/pdf" className="check-hidden-input" onChange={handleFileInput} ref={fileInputRef} type="file" />
    {fileError && <div className="check-file-error" role="alert">{fileError}</div>}
    {showSubmitConfirm && <B4SubmissionConfirm documents={documents} onCancel={() => setShowSubmitConfirm(false)} onConfirm={confirmSubmission} />}
    {showResubmitConfirm && <B6ResubmissionConfirm requestedIds={requestedIds} onCancel={() => setShowResubmitConfirm(false)} onConfirm={confirmResubmission} />}
  </div>
}

