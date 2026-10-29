import { useState } from 'react'
import type { AdminProject, ApplicantDocuments } from '../api/adminApi'
import { Button, CheckIcon, ChevronDownIcon, ChevronRightIcon, FileIcon, StatusBadge } from '../components/common'
import { ChevronLeftIcon } from './adminIcons'
import { D7RevisionPanel } from './D7RevisionPanel'
import { adminDocuments, adminStatusBadge, adminStatusLabels, formatDay, formatLong, formatShort, toLocalIso } from './mockAdminData'
import type { AdminApplicant, AdminDocument, AdminEvent, AdminIssue } from './mockAdminData'

function documentBadge(issues: AdminIssue[], submitted: boolean) {
  if (!submitted) return { label: '미제출', tone: 'none' }
  const errors = issues.filter((issue) => issue.kind === 'error').length
  const reviews = issues.length - errors
  if (errors) return { label: `오류 ${errors}`, tone: 'error' }
  if (reviews) return { label: `확인 필요 ${reviews}`, tone: 'review' }
  return { label: '통과', tone: 'pass' }
}

function Marker({ issue }: { issue?: AdminIssue }) {
  return issue ? <span className={`admin-doc-marker admin-doc-marker--${issue.kind}`}>{issue.number}</span> : null
}

function ContractPage({ applicant, clubName, issues }: { applicant: AdminApplicant; clubName: string; issues: AdminIssue[] }) {
  const signatureIssue = issues.find((issue) => issue.target === 'signature')
  const amountIssue = issues.find((issue) => issue.target === 'amount')
  const rows = [['품목', '노트북 2대'], ['계약 금액', '1,350,000원 (일금 일백삼십오만 원정)'], ['납품일', '2026년 9월 15일'], ['결제 방법', '계좌 이체']]
  return <div className="admin-a4">
    <div className="admin-a4__header"><strong>물품매매계약서</strong><p>매도인과 매수인은 아래 물품에 대해 다음과 같이 매매계약을 맺는다.</p></div>
    <div className="admin-a4__section">
      <strong>1. 계약 물품</strong>
      <div className={`admin-a4__table ${amountIssue ? 'admin-doc-flag admin-doc-flag--review' : ''}`}>
        {rows.map(([label, value]) => <div className="admin-a4__row" key={label}><span>{label}</span><span>{value}</span></div>)}
        <Marker issue={amountIssue} />
      </div>
    </div>
    <div className="admin-a4__section"><strong>2. 계약 조건</strong><p>매도인은 납품일까지 물품을 인도하고, 매수인은 인도 후 7일 이내에 대금을 지급한다.</p></div>
    <span className="admin-a4__spacer" />
    <p className="admin-a4__date">2026년 9월 10일</p>
    <div className="admin-a4__signatures">
      <div className="admin-a4__party"><strong>매도인</strong><span>OO전자</span><div className="admin-a4__rep"><b>대표 박판매</b><span className="admin-a4__sign">박판매</span></div></div>
      <div className="admin-a4__party"><strong>매수인</strong><span>창업동아리 {clubName}</span><div className="admin-a4__rep"><b>대표 {applicant.name}</b>
        <span className={`admin-a4__sign ${signatureIssue ? 'admin-doc-flag admin-doc-flag--error is-empty' : 'is-signed'}`}>{signatureIssue ? '(서명·날인)' : applicant.name}<Marker issue={signatureIssue} /></span>
      </div></div>
    </div>
  </div>
}

function PlaceholderPage({ title }: { title: string }) {
  return <div className="admin-a4"><div className="admin-a4__header"><strong>{title}</strong></div>{[100, 92, 96, 70, 100, 84, 60].map((width, i) => <span className="admin-a4__line" key={i} style={{ width: `${width}%` }} />)}</div>
}

// The 제출 서류 preview card shared by D6 and D9. D9 shows "수정 위치 없음" in the footer when AI found nothing.
export function ApplicantPreview({ applicant, documents, showPassedLegend = false }: { applicant: AdminApplicant; documents: ApplicantDocuments; showPassedLegend?: boolean }) {
  const [activeDocument, setActiveDocument] = useState<AdminDocument>('물품매매계약서')
  const { clubName, issues } = documents
  const submittedAt = applicant.lastSubmittedAt
  const uploadedAt = submittedAt && (issues.length ? toLocalIso(new Date(new Date(submittedAt).getTime() - 86_400_000)) : submittedAt)

  return <section className="check-preview-card admin-preview-card">
    <div className="check-tabs">
      <div className="check-tabs__list" role="tablist">
        {adminDocuments.map((document) => {
          const badge = documentBadge(issues.filter((issue) => issue.document === document), Boolean(submittedAt))
          return <button aria-selected={activeDocument === document} className={`check-tab ${activeDocument === document ? 'is-active' : ''}`} key={document} onClick={() => setActiveDocument(document)} role="tab" type="button">
            {document}<span className={`admin-tab-badge admin-tab-badge--${badge.tone}`}>{badge.label}</span>
          </button>
        })}
      </div>
      {submittedAt && uploadedAt && <div className="check-file-meta"><FileIcon width={14} height={14} /><span className="check-file-format">PDF</span><span>{activeDocument.replace(/ /g, '')}_{clubName}.pdf · {formatDay(uploadedAt)} 업로드</span></div>}
    </div>

    <div className="check-viewer">
      <aside className="check-thumbnail">
        <div className="admin-mini-page">{[24, 40, 40, 32, 40, 20].map((width, i) => <span key={i} style={{ width }} />)}</div>
        <span className="admin-strong">1</span>
      </aside>
      <div className="check-viewer__stage">
        {!submittedAt
          ? <p className="admin-empty">아직 제출하지 않았어요</p>
          : activeDocument === '물품매매계약서' ? <ContractPage applicant={applicant} clubName={clubName} issues={issues} /> : <PlaceholderPage title={activeDocument} />}
      </div>
    </div>

    <div className="admin-preview-footer">
      {showPassedLegend && issues.length === 0
        ? <div className="admin-legend"><span className="admin-legend__passed"><CheckIcon width={16} height={16} />AI가 찾은 수정 위치가 없어요</span></div>
        : <div className="admin-legend">
            <span><i className="admin-swatch admin-swatch--error" />오류</span>
            <span><i className="admin-swatch admin-swatch--review" />확인 필요</span>
            <span>번호는 오른쪽 결과 카드와 같아요</span>
          </div>}
      <div className="admin-page-control">
        <button aria-label="이전 페이지" disabled type="button"><ChevronLeftIcon width={16} height={16} /></button>
        <span><strong>1</strong> / 1</span>
        <button aria-label="다음 페이지" disabled type="button"><ChevronRightIcon width={16} height={16} /></button>
      </div>
    </div>
  </section>
}

export function ApplicantPager({ position, total, onMove }: { position: number; total: number; onMove: (step: number) => void }) {
  return <>
    <strong>{position} / {total}</strong>
    <div className="admin-pager">
      <button aria-label="이전 신청자" onClick={() => onMove(-1)} type="button"><ChevronLeftIcon width={16} height={16} /></button>
      <button aria-label="다음 신청자" onClick={() => onMove(1)} type="button"><ChevronRightIcon width={16} height={16} /></button>
    </div>
  </>
}

// revisionOpen: whether the D7 보완 요청 panel is open. AdminApp owns it so D7 gets its own browser-history entry.
export function D6ApplicantDetail({ project, applicant, documents, events, position, total, revisionOpen, onBack, onMove, onApprove, onRequestRevision, onRevisionOpenChange }: {
  project: AdminProject
  applicant: AdminApplicant
  documents: ApplicantDocuments
  events: AdminEvent[]
  position: number
  total: number
  onBack: () => void
  onMove: (step: number) => void
  onApprove: () => void
  onRequestRevision: (comment: string, attachAi: boolean) => Promise<void>
  revisionOpen: boolean
  onRevisionOpenChange: (open: boolean) => void
}) {
  const mode = revisionOpen ? 'revision' : 'comment'
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState('')

  const submittedAt = applicant.lastSubmittedAt
  const { issues } = documents
  const lastOf = (kind: AdminEvent['kind']) => [...events].reverse().find((event) => event.kind === kind)
  const canDecide = applicant.status === 'SUBMITTED' || applicant.status === 'SUBMITTED_INCOMPLETE' || applicant.status === 'REVIEW_PENDING'

  const startRevision = () => { onRevisionOpenChange(true); setExpanded(true) }
  const sendRevision = async (text: string, attachAi: boolean) => { await onRequestRevision(text, attachAi); onRevisionOpenChange(false); setComment('') }

  return <main className="admin-page">
    <div className="admin-page-header">
      <div className="admin-page-header__text">
        <div className="admin-breadcrumb"><button onClick={onBack} type="button">{project.name}</button><ChevronRightIcon width={14} height={14} /><span className="is-current is-strong">{applicant.name}</span></div>
        <div className="admin-title-row"><h1>{applicant.name}</h1></div>
      </div>
      <div className="admin-applicant-nav">
        <span className="admin-muted">{applicant.studentId}</span>
        <span className="admin-divider" />
        <ApplicantPager onMove={onMove} position={position} total={total} />
      </div>
    </div>

    <div className="admin-detail-body">
      <ApplicantPreview applicant={applicant} documents={documents} />

      <aside className="admin-panel">
        <div className="admin-panel__section">
          <div className="admin-badge-row">
            <StatusBadge status={adminStatusBadge[applicant.status]} label={adminStatusLabels[applicant.status]} />
            {submittedAt && issues.length === 0 && <span className="admin-ai-ok"><CheckIcon width={12} height={12} />AI 확인 완료</span>}
          </div>
          <strong className="admin-panel__time">{submittedAt ? `${formatLong(submittedAt)} ${applicant.status === 'REVIEW_PENDING' ? '재제출' : '제출'}` : '아직 제출하지 않았어요'}</strong>
          {applicant.status === 'SUBMITTED_INCOMPLETE' && <p className="admin-panel__note">AI 최종 확인 없이 제출됨</p>}
        </div>

        {submittedAt && issues.length > 0 && <div className="admin-panel__section">
          <div className="admin-warning">
            <button aria-expanded={expanded} className="admin-warning__toggle" onClick={() => setExpanded(!expanded)} type="button">
              <span className="admin-red-dot admin-red-dot--large" /><strong>AI 경고 {issues.length}건</strong><span className="admin-toolbar__spacer" /><span>{expanded ? '접기' : '펼치기'}</span><ChevronDownIcon className={expanded ? 'is-flipped' : ''} width={14} height={14} />
            </button>
            {expanded && <ol className="admin-issues">{issues.map((issue) => <li className={`admin-issue admin-issue--${issue.kind}`} key={issue.number}>
              <span className="admin-issue__number">{issue.number}</span>
              <div><small>{issue.kind === 'error' ? '오류' : '확인 필요'}</small><strong>{issue.title}</strong><span>{issue.location}</span></div>
            </li>)}</ol>}
          </div>
        </div>}

        <div className="admin-panel__section">
          {applicant.status === 'APPROVED'
            ? <><div className="admin-decision admin-decision--approved"><CheckIcon width={16} height={16} /><strong>승인했어요{lastOf('approved') && ` · ${formatLong(lastOf('approved')!.at)}`}</strong></div><DecisionButtons disabled /></>
            : applicant.status === 'NEEDS_REVISION'
              ? <><div className="admin-decision admin-decision--revision"><strong>보완 요청을 보냈어요{lastOf('revision') && ` · ${formatLong(lastOf('revision')!.at)}`}</strong>{lastOf('revision')?.comment && <p>{lastOf('revision')!.comment}</p>}<span>{lastOf('revision')?.attachAi ? 'AI 검사 결과도 함께 보냈어요. ' : ''}신청자가 다시 제출하면 알려드려요.</span></div><DecisionButtons disabled /></>
              : !canDecide
                ? <><span className="admin-label">담당자 의견</span><p className="admin-panel__note">신청자가 아직 서류를 제출하지 않았어요.</p><DecisionButtons disabled /></>
                : mode === 'revision'
                  ? <D7RevisionPanel comment={comment} onCancel={() => onRevisionOpenChange(false)} onCommentChange={setComment} onSend={sendRevision} />
                  : <>
                      <span className="admin-label">담당자 의견</span>
                      <textarea aria-label="담당자 의견" className="admin-textarea" maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="보완이 필요한 내용을 적어주세요" value={comment} />
                      <DecisionButtons onApprove={onApprove} onRequestFix={startRevision} />
                    </>}
        </div>

        <div className="admin-panel__section admin-history">
          <span className="admin-history__title">진행 이력</span>
          <ol>{events.map((event, i) => <li className={`admin-event admin-event--${event.tone}`} key={i}><i /><time>{formatShort(event.at)}</time><span>{event.label}</span></li>)}</ol>
        </div>
      </aside>
    </div>
  </main>
}

function DecisionButtons({ disabled = false, onRequestFix, onApprove }: { disabled?: boolean; onRequestFix?: () => void; onApprove?: () => void }) {
  return <div className="admin-actions">
    <Button disabled={disabled} onClick={onRequestFix} variant="secondary">보완 요청</Button>
    <Button disabled={disabled} onClick={onApprove}>승인</Button>
  </div>
}
