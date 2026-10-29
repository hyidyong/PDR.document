import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { AppHeader, Button, UploadIcon } from '../components/common'
import type { MainPage } from '../components/common'
import { B2DocumentCheck } from './B2DocumentCheck'
import { B3DocumentCheck } from './B3DocumentCheck'
import { B4SubmissionConfirm } from './B4SubmissionConfirm'
import { B5EmptyInbox, B5SubmissionInbox } from './B5SubmissionInbox'
import { B6ResubmissionConfirm } from './B6ResubmissionConfirm'
import { collectIssueFindings, documentLabels } from './checkModel'
import type { DocumentId, DocumentState, FlowOverview, SubmissionStatus, UploadedDocument } from './checkModel'
import './DocumentCheckFlow.css'
import { downloadDocument, getCase, getDocuments, getHistory, mapDocuments, resubmitCase, submitCase, toUploadedDocument, uploadDocument } from '../api'
import type { ApiDocument, ApiInspection, CaseView } from '../api'
import { formatDeadlineCompact } from '../utils/projectDeadline'

export function DocumentCheckFlow({ applicantId, deadlineAt, page, onNavigate, onLogout, onOverviewChange }: { applicantId: string; deadlineAt?: string | null; page: MainPage; onNavigate: (page: MainPage) => void; onLogout: () => void; onOverviewChange: (overview: FlowOverview) => void }) {
  const [activeId, setActiveId] = useState<DocumentId>('contract')
  const [documents, setDocuments] = useState<DocumentState>({})
  const [checkingId, setCheckingId] = useState<DocumentId | null>(null)
  const [fileError, setFileError] = useState('')
  const [analysisNotice, setAnalysisNotice] = useState('')
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

  const applyServerState = useCallback(async (caseView: CaseView, history: ApiInspection[], versions: Partial<Record<DocumentId, ApiDocument[]>>) => {
    const current = mapDocuments(caseView.currentDocuments, Object.values(caseView.currentInspections))
    const feedback = caseView.feedback.at(-1)
    const firstSubmission = caseView.submissions[0]
    const originals: DocumentState = {}
    if (feedback) {
      for (const id of ['plan', 'contract', 'receipts'] as DocumentId[]) {
        const version = feedback.originalVersions[id]
        const document = versions[id]?.find((item) => item.version === version)
        if (document) originals[id] = toUploadedDocument(document, history.filter((item) => item.documentId === document.id).at(-1))
      }
    }
    const hydrate = async (state: DocumentState, apiDocuments: Partial<Record<DocumentId, ApiDocument>>) => {
      const hydrated: DocumentState = { ...state }
      await Promise.all((Object.keys(apiDocuments) as DocumentId[]).map(async (id) => {
        const apiDocument = apiDocuments[id]
        if (!apiDocument || !hydrated[id]) return
        try {
          hydrated[id] = { ...hydrated[id]!, file: await downloadDocument(applicantId, apiDocument) }
        } catch (error) {
          setFileError(error instanceof Error ? error.message : 'PDF를 불러오지 못했습니다.')
        }
      }))
      return hydrated
    }
    const hydratedCurrent = await hydrate(current, caseView.currentDocuments)
    const originalApiDocuments: Partial<Record<DocumentId, ApiDocument>> = {}
    if (feedback) {
      for (const id of ['plan', 'contract', 'receipts'] as DocumentId[]) {
        const version = feedback.originalVersions[id]
        const document = versions[id]?.find((item) => item.version === version)
        if (document) originalApiDocuments[id] = document
      }
    }
    const hydratedOriginals = feedback ? await hydrate(originals, originalApiDocuments) : hydratedCurrent
    setDocuments(hydratedCurrent)
    setSubmittedDocuments(hydratedCurrent)
    setOriginalDocuments(hydratedOriginals)
    setSubmissionStatus(caseView.status === 'DRAFT' ? 'draft' : caseView.status === 'SUBMITTED' ? 'submitted' : 'incomplete')
    setSubmittedAt(firstSubmission ? new Date(firstSubmission.at) : null)
    setRequestedIds(feedback?.targetRequirementIds ?? [])
    setReviewRequestedAt(feedback ? new Date(feedback.createdAt) : null)
    setResubmittedAt(caseView.submissions.length > 1 ? new Date(caseView.submissions.at(-1)!.at) : null)
  }, [applicantId])

  useEffect(() => {
    let active = true
    Promise.all([getCase(applicantId), getHistory(applicantId), getDocuments(applicantId)])
      .then(async ([caseView, history, versions]) => { if (active) await applyServerState(caseView, history.inspections, versions) })
      .catch((error) => { if (active) setFileError(error instanceof Error ? error.message : '제출 정보를 불러오지 못했습니다.') })
    return () => { active = false }
  }, [applicantId, page, applyServerState])

  useEffect(() => {
    onOverviewChange({ documents, checkingId, submissionStatus, submittedAt, reviewRequestedAt, resubmittedAt, isResubmitting })
  }, [documents, checkingId, submissionStatus, submittedAt, reviewRequestedAt, resubmittedAt, isResubmitting, onOverviewChange])

  const selectFile = async (file: File, id = activeId) => {
    if (submissionStatus !== 'draft' && !isResubmitting) return
    if (isResubmitting && !requestedIds.includes(id)) return
    setFileError('')
    setAnalysisNotice('')
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('PDF 파일을 선택해 주세요.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('파일 크기는 Storage 제한에 따라 10MB 이하로 선택해 주세요.')
      return
    }
    setCheckingId(id)
    try {
      const uploaded = await uploadDocument(applicantId, id, file)
      const caseView = await getCase(applicantId)
      const inspection = caseView.currentInspections[id]
      setDocuments((current) => ({ ...current, [id]: { ...toUploadedDocument(uploaded, inspection), file } }))
      const edgeUnauthorized = inspection?.source === 'AI_ERROR'
        && inspection.findings.some((finding) => finding.id === 'AI_ERROR' && finding.message.includes('[HTTP 401 /'))
      if (edgeUnauthorized) {
        setAnalysisNotice('PDF는 정상 업로드됐지만 Edge AI 인증이 거부되었습니다. 세션을 강제 갱신하거나 유료 분석을 자동 재시도하지 않았습니다.')
      }
      if (file.size > 4_000_000) setAnalysisNotice('업로드는 완료되었지만 4MB를 초과한 PDF는 AI 분석을 진행할 수 없습니다.')
    } catch (error) {
      setFileError(error instanceof Error ? error.message : '파일을 업로드하지 못했습니다.')
    } finally {
      setCheckingId(null)
    }
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
  const issueFindings = collectIssueFindings(documents)
  const errorCount = issueFindings.filter((finding) => finding.status === 'recommend').length
  const reviewCount = issueFindings.filter((finding) => finding.status === 'unverifiable').length
  const checkRound = remaining.reduce((sum, doc) => sum + doc.version, 0)
  const latestCheck = remaining.reduce<Date | null>((latest, doc) => !latest || doc.checkedAt > latest ? doc.checkedAt : latest, null)
  const checkTime = latestCheck ? `${String(latestCheck.getMonth() + 1).padStart(2, '0')}.${String(latestCheck.getDate()).padStart(2, '0')} ${String(latestCheck.getHours()).padStart(2, '0')}:${String(latestCheck.getMinutes()).padStart(2, '0')}` : ''
  const screenProps = { activeId, documents, checkingId, current, passedCount, onTabChange: changeTab, onReupload: openFilePicker, onFileSelect: selectFile, isResubmitting, editableIds: requestedIds, checkRound, checkTime }

  const confirmSubmission = async () => {
    setCheckingId(activeId)
    try {
      await submitCase(applicantId)
      const [caseView, history, versions] = await Promise.all([getCase(applicantId), getHistory(applicantId), getDocuments(applicantId)])
      await applyServerState(caseView, history.inspections, versions)
      setShowSubmitConfirm(false)
      onNavigate('inbox')
    } catch (error) {
      setFileError(error instanceof Error ? error.message : '최종 제출에 실패했습니다.')
      setShowSubmitConfirm(false)
    } finally { setCheckingId(null) }
  }

  const startResubmission = () => {
    setDocuments({ ...submittedDocuments })
    setActiveId(requestedIds[0] ?? 'contract')
    setIsResubmitting(true)
    setFileError('')
    onNavigate('check')
  }

  const confirmResubmission = async () => {
    setCheckingId(activeId)
    try {
      await resubmitCase(applicantId)
      const [caseView, history, versions] = await Promise.all([getCase(applicantId), getHistory(applicantId), getDocuments(applicantId)])
      await applyServerState(caseView, history.inspections, versions)
      setShowResubmitConfirm(false)
      setIsResubmitting(false)
      onNavigate('inbox')
    } catch (error) {
      setFileError(error instanceof Error ? error.message : '재제출에 실패했습니다.')
      setShowResubmitConfirm(false)
    } finally { setCheckingId(null) }
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
      <div className="check-page-heading"><div className="check-breadcrumb">한국대학교 창업지원단 <span>›</span> 2026 창업동아리 지원사업 정산</div><div className="check-title-row"><h1>제출 서류 점검</h1><span className="check-deadline">{formatDeadlineCompact(deadlineAt)}</span><span className="check-round">점검 {checkRound}회차{checkTime && ` · ${checkTime}`}</span></div></div>
      {isResubmitting && <div className="check-resubmission-note"><strong>보완 요청 서류를 수정하고 있어요</strong><span>교체 대상: {requestedIds.map((id) => documentLabels[id]).join(', ')} · 이전 제출 파일과 검사 결과는 기록으로 보관돼요.</span></div>}
      {activeId === 'receipts' ? <B3DocumentCheck {...screenProps} /> : <B2DocumentCheck {...screenProps} />}
    </main>
    <div className="check-actionbar"><div className="check-actionbar__inner"><span className="check-action-note">{submissionStatus !== 'draft' && !isResubmitting ? '제출한 서류는 내 제출함에서 확인할 수 있어요.' : isResubmitting ? allDocumentsPassed ? '모든 항목을 확인했어요. 담당자에게 다시 제출할 수 있어요.' : checkingId ? 'AI 검사 중이에요.' : '보완 요청 서류를 교체하고 AI 검사를 확인해 주세요.' : errorCount || reviewCount ? `오류 ${errorCount}건, 확인 필요 ${reviewCount}건이 남아 있어요` : '파일을 올리면 AI 검사가 자동으로 시작돼요'}</span><div className="check-action-buttons"><Button disabled={(submissionStatus !== 'draft' && !isResubmitting) || (isResubmitting && !requestedIds.includes(activeId))} variant="secondary" onClick={() => openFilePicker()}><UploadIcon width={16} height={16} /> {isResubmitting || activeId === 'contract' ? '수정본 올리기' : '수정본 다시 올리기'}</Button><Button disabled={(submissionStatus !== 'draft' && !isResubmitting) || checkingId !== null || (isResubmitting && (!requestedDocumentsReady || !allDocumentsPassed))} onClick={() => isResubmitting ? setShowResubmitConfirm(true) : setShowSubmitConfirm(true)}>{isResubmitting ? '재제출하기' : '제출하기'}</Button></div></div></div>
    <input aria-label={`${documentLabels[activeId]} 파일 선택`} accept=".pdf,application/pdf" className="check-hidden-input" onChange={handleFileInput} ref={fileInputRef} type="file" />
    {fileError && <div className="check-file-error" role="alert">{fileError}</div>}
    {analysisNotice && <div className="check-file-error" role="status">{analysisNotice}</div>}
    {showSubmitConfirm && <B4SubmissionConfirm documents={documents} onCancel={() => setShowSubmitConfirm(false)} onConfirm={confirmSubmission} />}
    {showResubmitConfirm && <B6ResubmissionConfirm requestedIds={requestedIds} onCancel={() => setShowResubmitConfirm(false)} onConfirm={confirmResubmission} />}
  </div>
}

