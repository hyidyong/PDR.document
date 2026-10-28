import { AppHeader, Button, FileIcon, StatusBadge } from '../components/common'
import type { MainPage } from '../components/common'
import { documentLabels } from './checkModel'
import type { DocumentId, DocumentState, Finding } from './checkModel'
import './B5SubmissionInbox.css'

const documentIds: DocumentId[] = ['plan', 'contract', 'receipts']

function InboxHeader({ onNavigate, onLogout }: { onNavigate: (page: MainPage) => void; onLogout: () => void }) {
  return <AppHeader activePage="inbox" onNavigate={onNavigate} onLogout={onLogout} />
}

export function B5EmptyInbox({ onNavigate, onLogout }: { onNavigate: (page: MainPage) => void; onLogout: () => void }) {
  return <div className="b5-screen">
    <InboxHeader onNavigate={onNavigate} onLogout={onLogout} />
    <main className="b5-main">
      <div className="b5-heading"><div className="b5-breadcrumb">한국대학교 창업지원단 <span>›</span> 내 제출함</div><div className="b5-title-row"><h1>내 제출함</h1></div></div>
      <div className="b5-body"><section className="b5-empty" aria-label="제출 내역 없음">아직 제출 내역이 없어요. 서류 점검에서 최종 제출을 완료하면 이곳에 표시돼요.</section></div>
    </main>
  </div>
}

function formatDate(date: Date, includeTime = false) {
  const day = `${date.getMonth() + 1}월 ${date.getDate()}일`
  return includeTime ? `${day} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : day
}

function getFindingSource(finding: Finding) {
  return finding.number === 1 ? '물품매매계약서 · 1쪽' : '서류 간 비교 · 물품매매계약서 ↔ 영수증 첨부철'
}

function getFindingDescription(finding: Finding) {
  if (finding.number === 1) return '매수인(동아리 대표) 서명란과 날인란이 비어 있어요.'
  if (finding.number === 2) return '계약서 금액은 1,350,000원인데 영수증 첨부철 합계는 1,320,000원이에요.'
  return finding.title
}

export function B5SubmissionInbox({ documents, originalDocuments, status, submittedAt, reviewRequestedAt, resubmittedAt, requestedIds, onResubmit, onNavigate, onLogout }: {
  documents: DocumentState
  originalDocuments: DocumentState
  status: 'submitted' | 'incomplete'
  submittedAt: Date
  reviewRequestedAt: Date | null
  resubmittedAt: Date | null
  requestedIds: DocumentId[]
  onResubmit?: () => void
  onNavigate: (page: MainPage) => void
  onLogout: () => void
}) {
  const uploadedIds = documentIds.filter((id) => documents[id])
  const missingIds = documentIds.filter((id) => !documents[id])
  const findings = [...(documents.contract?.findings ?? []), ...(documents.receipts?.findings ?? [])]
    .filter((finding, index, all) => all.findIndex((other) => other.number === finding.number) === index)
    .sort((left, right) => left.number - right.number)
  const errors = findings.filter((finding) => finding.status === 'recommend').length
  const reviews = findings.filter((finding) => finding.status === 'unverifiable').length
  const outcome = status === 'incomplete' ? '제출(미비)' : '제출 완료'
  const summary = status === 'incomplete'
    ? '서류가 제출(미비) 상태로 접수됐어요. 담당자가 확인 후 보완을 요청할 수 있어요.'
    : '서류가 제출 완료 상태로 접수됐어요. 담당자가 확인할 예정이에요.'
  const details = [errors && `오류 ${errors}건`, reviews && `확인 필요 ${reviews}건`, missingIds.length && `미업로드 ${missingIds.length}건`].filter(Boolean).join(', ')
  const reviewPending = Boolean(reviewRequestedAt && !resubmittedAt)
  const originalFindings = [...(originalDocuments.contract?.findings ?? []), ...(originalDocuments.receipts?.findings ?? [])]
    .filter((finding, index, all) => all.findIndex((other) => other.number === finding.number) === index)
    .sort((left, right) => left.number - right.number)
  const originalMissing = documentIds.filter((id) => !originalDocuments[id])
  const originalErrors = originalFindings.filter((finding) => finding.status === 'recommend').length
  const originalReviews = originalFindings.filter((finding) => finding.status === 'unverifiable').length
  const originalDetails = [originalErrors && `오류 ${originalErrors}건`, originalReviews && `확인 필요 ${originalReviews}건`, originalMissing.length && `미업로드 ${originalMissing.length}건`].filter(Boolean).join(', ')
  const reviewerMessage = requestedIds.length === 2 && requestedIds.includes('contract') && requestedIds.includes('receipts') && originalFindings.some((finding) => finding.number === 1) && originalFindings.some((finding) => finding.number === 2)
    ? '물품매매계약서에 매수인 서명·날인이 빠져 있어요. 그리고 계약 금액과 영수증 합계가 30,000원 차이 나요. 서명 후 빠진 영수증을 첨부해서 다시 제출해주세요.'
    : `${originalFindings.map((finding) => finding.title).concat(originalMissing.map((id) => `${documentLabels[id]} 미업로드`)).join(', ')}. 요청한 서류를 보완해서 다시 제출해주세요.`
  const latestDate = resubmittedAt ?? submittedAt
  const currentStatus = reviewPending ? 'needs-review' : resubmittedAt ? 'checking' : status
  const currentLabel = reviewPending ? '보완 필요' : resubmittedAt ? '검토 대기' : outcome

  return <div className="b5-screen">
    <InboxHeader onNavigate={onNavigate} onLogout={onLogout} />
    <main className="b5-main">
      <div className="b5-heading"><div className="b5-breadcrumb">한국대학교 창업지원단 <span>›</span> 내 제출함</div><div className="b5-title-row"><h1>2026 창업동아리 지원사업 정산</h1><StatusBadge status={currentStatus} label={currentLabel} /></div></div>
      <div className="b5-body">
        <div className="b5-content">
          {reviewPending && <section className="b5-review-card" aria-labelledby="b5-review-title">
            <div className="b5-review-card__head"><span className="b5-review-card__avatar" aria-hidden="true"><svg fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" /><path d="M5.5 20c.2-3.5 2.7-5.5 6.5-5.5s6.3 2 6.5 5.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg></span><div><h2 id="b5-review-title">담당자 의견</h2><span>· 박담당 · {formatDate(reviewRequestedAt!)}</span></div></div>
            <p className="b5-review-card__message"><span aria-hidden="true">“</span>{reviewerMessage}</p>
            <div className="b5-review-card__footer"><span className="b5-review-card__related">관련 서류 · {requestedIds.map((id) => documentLabels[id]).join(', ')}</span><Button onClick={onResubmit}>수정해서 재제출 <span aria-hidden="true">↻</span></Button></div>
            <small>시연용 mock 담당자 의견</small>
          </section>}
          {!reviewPending && <section className="b5-receipt-card" aria-labelledby="b5-receipt-title">
            <div className="b5-receipt-card__head"><span className="b5-receipt-card__symbol" aria-hidden="true">✓</span><span>{resubmittedAt ? '서류 재제출' : '서류 제출'} <span className="b5-receipt-card__divider">·</span> {formatDate(latestDate, true)}</span></div>
            <h2 id="b5-receipt-title">{resubmittedAt ? '재제출이 접수됐어요' : `${outcome} 상태로 접수됐어요`}</h2>
            <p>{resubmittedAt ? '수정본이 담당자 검토 대기 상태로 변경됐어요. 최종 승인 여부는 담당자가 결정해요.' : summary}</p>
            <div className="b5-receipt-card__footer"><span>{details || 'AI 검사에서 남은 항목이 없어요'}</span><span>담당자 확인 대기</span></div>
          </section>}

          <section className="b5-section" aria-labelledby="b5-documents-title">
            <div className="b5-section__head"><h2 id="b5-documents-title">제출한 서류</h2><span>{uploadedIds.length}개</span></div>
            {uploadedIds.length ? <div className="b5-doc-grid">{uploadedIds.map((id) => {
              const document = documents[id]!
              const isReviewTarget = reviewPending && requestedIds.includes(id)
              const documentStatus = isReviewTarget ? '보완 필요' : reviewPending && document.status === 'pass' ? '확인 완료' : document.status === 'pass' ? '통과' : document.status === 'recommend' ? '오류' : '확인 필요'
              return <article className={`b5-doc-card ${isReviewTarget ? 'is-review-target' : ''}`} key={id}>
                <div className="b5-doc-card__top"><span className="b5-doc-card__icon"><FileIcon width={20} height={20} /></span><span className={`b5-doc-card__badge ${isReviewTarget ? 'is-review-target' : `is-${document.status}`}`}>{documentStatus}</span></div>
                <div className="b5-doc-card__text"><span className="b5-doc-card__label">{documentLabels[id]}</span><strong title={document.file.name}>{document.file.name}</strong><div className="b5-doc-card__meta"><span>PDF</span>{resubmittedAt && document.version > (originalDocuments[id]?.version ?? 0) ? '재제출일' : '제출일'} {formatDate(resubmittedAt && document.version > (originalDocuments[id]?.version ?? 0) ? resubmittedAt : submittedAt)}</div></div>
              </article>
            })}</div> : <div className="b5-empty">제출된 파일이 없어요.</div>}
            {missingIds.length > 0 && <p className="b5-missing">미업로드 서류: {missingIds.map((id) => documentLabels[id]).join(', ')}</p>}
          </section>

          <section className="b5-section" aria-labelledby="b5-ai-title">
            <div className="b5-section__head"><h2 id="b5-ai-title">AI 검사 기록</h2><span>{formatDate(latestDate)} {resubmittedAt ? '재제출' : '제출'} 전에 AI가 먼저 찾은 내용이에요</span></div>
            {findings.length ? <div className="b5-results">{findings.map((finding) => <article className="b5-result-card" key={finding.number}>
              <div className="b5-result-card__head"><span className={`b5-result-card__badge is-${finding.status}`}>{finding.status === 'recommend' ? '오류' : '확인 필요'}</span><span>{getFindingSource(finding)}</span></div>
              <h3>{finding.title}</h3>
              <div className="b5-result-card__details"><div><span>무엇이</span><p>{getFindingDescription(finding)}</p></div><div><span>어디서</span><p>{finding.location}</p></div><div><span>어떻게 고치나</span><p>{finding.advice}</p></div></div>
              <p className="b5-result-card__note">AI 검사 결과는 참고용이에요. 최종 판단은 담당자가 해요</p>
            </article>)}</div> : <div className="b5-empty">{uploadedIds.length ? 'AI 검사에서 남은 항목이 없어요.' : '업로드된 서류가 없어 AI 검사 기록이 없어요.'}</div>}
            <p className="b5-mock-note">시연용 mock AI 검사 결과예요. 실제 파일 내용은 분석하지 않았어요.</p>
            {resubmittedAt && <div className="b5-prior-record"><h3>이전 제출의 서류와 AI 검사 기록</h3><span>{formatDate(submittedAt)} · {originalDetails || 'AI 검사에서 남은 항목 없음'}</span><ul>{documentIds.filter((id) => originalDocuments[id]).map((id) => <li key={id}>{documentLabels[id]} · {originalDocuments[id]!.file.name}</li>)}</ul>{originalFindings.map((finding) => <div className="b5-prior-record__finding" key={finding.number}><strong>{finding.status === 'recommend' ? '오류' : '확인 필요'} · {finding.title}</strong><span>{finding.location}</span><p>{finding.advice}</p></div>)}</div>}
          </section>
        </div>
        <aside className="b5-history" aria-labelledby="b5-history-title"><h2 id="b5-history-title">진행 이력</h2><ol className="b5-timeline"><li><span className="b5-timeline__date">{formatDate(submittedAt, true)}</span><div className="b5-timeline__title">서류 제출 <StatusBadge status={status} label={outcome} /></div><p>{status === 'incomplete' ? `${originalDetails}이 남은 채 제출됐어요` : '서류 3개가 모두 통과한 상태로 제출됐어요'}</p></li>
          {reviewRequestedAt && <><li><span className="b5-timeline__date">{formatDate(reviewRequestedAt)}</span><div className="b5-timeline__title">담당자 확인</div><p>박담당 님이 서류를 확인했어요</p></li><li><span className="b5-timeline__date">{formatDate(reviewRequestedAt)}</span><div className="b5-timeline__title">보완 요청 <StatusBadge status="needs-review" /></div><p>{requestedIds.map((id) => documentLabels[id]).join(', ')} 보완 요청</p></li></>}
          {resubmittedAt && <li><span className="b5-timeline__date">{formatDate(resubmittedAt, true)}</span><div className="b5-timeline__title">재제출 <StatusBadge status="resubmit" /></div><p>수정본 {requestedIds.length}개를 다시 제출했어요</p></li>}
          <li className="is-current"><span className="b5-timeline__date">지금</span><div className="b5-timeline__title">{reviewPending ? '재제출 대기' : '담당자 확인 대기'}</div><p>{reviewPending ? '요청한 서류를 수정하고 다시 제출해 주세요' : '담당자가 제출한 서류를 확인할 예정이에요'}</p></li></ol></aside>
      </div>
    </main>
  </div>
}
