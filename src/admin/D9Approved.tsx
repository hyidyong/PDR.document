import { useState } from 'react'
import type { AdminProject, ApplicantDocuments } from '../api/adminApi'
import { Button, CheckIcon, ChevronRightIcon, StatusBadge } from '../components/common'
import { ArrowRightIcon, LockIcon, UndoIcon } from './adminIcons'
import { ApplicantPager, ApplicantPreview } from './D6ApplicantDetail'
import { adminDocuments, formatDay, formatLong, formatShort } from './mockAdminData'
import type { AdminApplicant, AdminEvent } from './mockAdminData'

// D9 승인 완료: the D6 layout for an approved applicant, with a read-only result panel.
export function D9Approved({ project, applicant, documents, events, position, total, onBack, onMove, onCancelApproval }: {
  project: AdminProject
  applicant: AdminApplicant
  documents: ApplicantDocuments
  events: AdminEvent[]
  position: number
  total: number
  onBack: () => void
  onMove: (step: number) => void
  onCancelApproval: () => Promise<void>
}) {
  const [cancelling, setCancelling] = useState(false)
  const { issues } = documents
  const submittedAt = applicant.lastSubmittedAt
  const resubmitted = events.some((event) => event.kind === 'resubmit')
  const submitLabel = resubmitted ? '재제출' : '제출'
  const approvedEvent = [...events].reverse().find((event) => event.kind === 'approved')
  const previousRequest = [...events].reverse().find((event) => event.kind === 'revision' && event.comment)

  const errors = issues.filter((issue) => issue.kind === 'error').length
  const reviews = issues.length - errors
  const documentResults = adminDocuments.map((document) => {
    const found = issues.filter((issue) => issue.document === document)
    const tone = found.some((issue) => issue.kind === 'error') ? 'error' : found.length ? 'review' : 'pass'
    const description = found.length ? `${found[0].title}${found.length > 1 ? ` 외 ${found.length - 1}건` : ''}` : 'AI가 찾은 문제가 없어요'
    return { document, tone, description, state: tone === 'error' ? '오류' : tone === 'review' ? '확인 필요' : '통과' }
  })
  const passedCount = documentResults.filter((result) => result.tone === 'pass').length

  const cancelApproval = async () => {
    setCancelling(true)
    try { await onCancelApproval() } catch (error) { console.error(error); setCancelling(false) }
  }

  return <main className="admin-page">
    <div className="admin-page-header">
      <div className="admin-page-header__text">
        <div className="admin-breadcrumb"><button onClick={onBack} type="button">{project.name}</button><ChevronRightIcon width={14} height={14} /><span className="is-current is-strong">{applicant.name}</span></div>
        <div className="admin-title-row">
          <h1>{applicant.name}</h1>
          <StatusBadge status="approved" label="승인" />
          <span className="admin-round">{submitLabel} 서류 · 담당자 승인 완료</span>
        </div>
      </div>
      <div className="admin-applicant-nav">
        <span className="admin-muted">{applicant.studentId}{submittedAt && ` · ${submitLabel} ${formatShort(submittedAt)}`}</span>
        <ApplicantPager onMove={onMove} position={position} total={total} />
      </div>
    </div>

    <div className="admin-detail-body admin-detail-body--approved">
      <ApplicantPreview applicant={applicant} documents={documents} showPassedLegend />

      <aside className="admin-approved">
        <div className="admin-approved__head">
          <div className="admin-approved__title"><h2>AI 검사 결과</h2><span className="admin-readonly"><LockIcon width={11} height={11} />읽기 전용</span></div>
          {issues.length === 0
            ? <span className="admin-approved__counts"><CheckIcon width={14} height={14} />모두 통과</span>
            : <span className="admin-ai">{errors > 0 && <span className="admin-ai--error">오류 {errors}</span>}{errors > 0 && reviews > 0 && <span className="admin-ai--none">·</span>}{reviews > 0 && <span className="admin-ai--review">확인 {reviews}</span>}</span>}
        </div>

        <section className="admin-card">
          <div className="admin-checklist__head">
            <div className="admin-checklist__row">
              <strong>{passedCount === adminDocuments.length ? `제출 서류 ${adminDocuments.length}개 모두 통과` : `제출 서류 ${adminDocuments.length}개 중 ${passedCount}개 통과`}</strong>
              <span>{passedCount}/{adminDocuments.length}</span>
            </div>
            <div className="admin-checklist__track"><span style={{ width: `${(passedCount / adminDocuments.length) * 100}%` }} /></div>
          </div>
          <ul className="admin-checklist">
            {documentResults.map((result) => <li className={`admin-checklist__item admin-checklist__item--${result.tone}`} key={result.document}>
              <span className="admin-checklist__icon">{result.tone === 'pass' ? <CheckIcon width={16} height={16} /> : '!'}</span>
              <div><strong>{result.document}</strong><span>{result.description}</span></div>
              <b>{result.state}</b>
            </li>)}
          </ul>
        </section>

        <section className="admin-card">
          <h2>진행 이력</h2>
          <ol className="admin-timeline">
            {events.map((event, i) => <li className={`admin-timeline__event admin-timeline__event--${event.tone}`} key={i}>
              <i />
              <div><span>{event.label}</span><time>{formatShort(event.at)}</time></div>
            </li>)}
          </ol>
        </section>

        <section className="admin-card">
          <div className="admin-card__head"><h2>담당자 의견</h2><span>박담당</span></div>
          <div className="admin-approved__done">
            <span className="admin-approved__check"><CheckIcon width={18} height={18} /></span>
            <div><strong>승인했어요</strong>{approvedEvent && <span>{formatLong(approvedEvent.at)} · 신청자에게 이메일로 알렸어요</span>}</div>
          </div>
          {previousRequest && <div className="admin-approved__previous">
            <strong>이전 보완 요청 · {formatDay(previousRequest.at)}</strong>
            <p>{previousRequest.comment}</p>
          </div>}
          <div className="admin-approved__buttons">
            <Button disabled={cancelling} onClick={cancelApproval} variant="secondary"><UndoIcon width={16} height={16} />승인 취소</Button>
            <Button onClick={() => onMove(1)}>다음 신청자<ArrowRightIcon width={16} height={16} /></Button>
          </div>
        </section>
      </aside>
    </div>
  </main>
}
