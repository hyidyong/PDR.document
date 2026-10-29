import type { AdminProject } from '../api/adminApi'
import { ChevronRightIcon } from '../components/common'
import { ClockIcon } from './adminIcons'
import { adminDocuments, getIssues } from './mockAdminData'
import type { AdminApplicant, AdminDocument } from './mockAdminData'
import { formatDeadlineBadge } from '../utils/projectDeadline'

type DocumentRow = { document: AdminDocument; submitted: number; error: number; review: number; revision: number; missing: number }

// Per 서류: 미제출 = 아직 제출하지 않은 신청자. 오류·확인 필요 = AI 결과에 그 서류 항목이 있는 제출자 (승인된 신청자는 확인이 끝났으므로 빼요).
// 보완 요청 중 = 그 서류에 항목이 있고 보완 요청을 받은 신청자. All counts follow the mock state, so D6~D9 changes show up here.
function countDocuments(applicants: AdminApplicant[]): DocumentRow[] {
  return adminDocuments.map((document) => {
    const row: DocumentRow = { document, submitted: 0, error: 0, review: 0, revision: 0, missing: 0 }
    for (const applicant of applicants) {
      if (applicant.status === 'DRAFT') { row.missing++; continue }
      row.submitted++
      if (applicant.status === 'APPROVED') continue
      const issues = getIssues(applicant).filter((issue) => issue.document === document)
      if (issues.some((issue) => issue.kind === 'error')) row.error++
      if (issues.some((issue) => issue.kind === 'review')) row.review++
      if (issues.length && applicant.status === 'NEEDS_REVISION') row.revision++
    }
    return row
  })
}

const count = (value: number, tone: string) => <span className={`admin-ai ${value ? tone : 'admin-ai--none'}`}>{value}</span>

// D10 서류 현황 (header 서류 관리). There is no design frame for it; it reuses the D1 card and table styles.
export function D10DocumentStatus({ project, applicants, onOpenProject }: { project: AdminProject; applicants: AdminApplicant[]; onOpenProject: () => void }) {
  const rows = countDocuments(applicants)
  const total = applicants.length

  return <main className="admin-page admin-page--wide d1-page">
    <div className="admin-page-header">
      <div className="admin-page-header__text">
        <div className="admin-breadcrumb"><span>서류 관리</span><ChevronRightIcon width={14} height={14} /><span className="is-current">{project.name}</span></div>
        <div className="admin-title-row"><h1>서류 현황</h1><span className="admin-deadline"><ClockIcon width={14} height={14} />{formatDeadlineBadge(project.deadlineAt)}</span></div>
      </div>
    </div>

    <section className="d1-card">
      <div className="d1-card__head">
        <div className="d1-card__title"><h2>서류별 현황</h2><span className="d1-card__count">{rows.length}종 · 신청자 {total}명</span></div>
      </div>
      <table className="d1-table d10-table">
        <colgroup><col /><col className="d10-col-progress" /><col className="d10-col-count" /><col className="d10-col-count" /><col className="d10-col-count" /><col className="d10-col-count" /><col className="d1-col-more" /></colgroup>
        <thead><tr><th>서류</th><th>제출</th><th>오류</th><th>확인 필요</th><th>보완 요청 중</th><th>미제출</th><th aria-label="열기" /></tr></thead>
        <tbody>
          {rows.map((row) => {
            const percent = total ? Math.round((row.submitted / total) * 100) : 0
            return <tr aria-label={`${row.document} 신청자 목록 보기`} key={row.document} onClick={onOpenProject} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenProject() } }} tabIndex={0}>
              <td><strong>{row.document}</strong></td>
              <td>
                <span className="d1-progress">
                  <span className="d1-progress__label"><span><strong>{row.submitted}/{total}</strong> 제출</span><span>{percent}%</span></span>
                  <span className="d1-progress__track"><span style={{ width: `${percent}%` }} /></span>
                </span>
              </td>
              <td>{count(row.error, 'admin-ai--error')}</td>
              <td>{count(row.review, 'admin-ai--review')}</td>
              <td>{count(row.revision, 'admin-ai--pass')}</td>
              <td>{count(row.missing, 'admin-ai--pass')}</td>
              <td className="admin-row-arrow"><ChevronRightIcon width={20} height={20} /></td>
            </tr>
          })}
        </tbody>
      </table>
      <p className="admin-notice">오류·확인 필요는 AI 결과에 그 서류 항목이 있는 신청자 수예요. 승인한 신청자는 빼고 세요. 행을 누르면 신청자 목록으로 가요.</p>
    </section>
  </main>
}
