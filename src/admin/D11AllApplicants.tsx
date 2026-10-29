import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { AdminProject, CreatedProject } from '../api/adminApi'
import { ChevronDownIcon, ChevronRightIcon, StatusBadge } from '../components/common'
import { showNotice } from '../store/noticeStore'
import { ChevronLeftIcon, FolderIcon, SearchIcon } from './adminIcons'
import { adminStatusBadge, adminStatusLabels, formatShort, otherProjectApplicants } from './mockAdminData'
import type { AdminApplicant, AdminStatus } from './mockAdminData'

const PAGE_SIZE = 10
const ALL = ''
// applicantId is set only for the 2026 창업동아리 신청자, the ones with D6 data.
type Row = { key: string; applicantId?: string; name: string; studentId: string; projectName: string; status: AdminStatus; lastSubmittedAt: string | null }

const byRecent = (a: Row, b: Row) => (b.lastSubmittedAt ?? '').localeCompare(a.lastSubmittedAt ?? '') || a.name.localeCompare(b.name, 'ko')

// D11 전체 신청자 (header 신청자): every project's 신청자 in one table, with D5's table styles. No design frame.
export function D11AllApplicants({ project, applicants, createdProjects, onOpenApplicant }: { project: AdminProject; applicants: AdminApplicant[]; createdProjects: CreatedProject[]; onOpenApplicant: (applicantId: string) => void }) {
  const [query, setQuery] = useState('')
  const [projectName, setProjectName] = useState(ALL)
  const [page, setPage] = useState(1)

  const rows: Row[] = [
    ...applicants.map((applicant) => ({ key: applicant.applicantId, applicantId: applicant.applicantId, name: applicant.name, studentId: applicant.studentId, projectName: project.name, status: applicant.status, lastSubmittedAt: applicant.lastSubmittedAt })),
    ...createdProjects.flatMap((created) => (created.roster ?? []).map((row) => ({ key: `${created.id}-${row.id}`, name: row.name, studentId: row.studentId, projectName: created.name, status: 'DRAFT' as AdminStatus, lastSubmittedAt: null }))),
    ...otherProjectApplicants,
  ].sort(byRecent)
  const projectNames = [...new Set([project.name, ...createdProjects.map((created) => created.name), ...otherProjectApplicants.map((row) => row.projectName)])]

  const text = query.trim()
  const visible = rows.filter((row) => (projectName === ALL || row.projectName === projectName) && (!text || row.name.includes(text) || row.studentId.includes(text)))
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const pageRows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const rangeStart = visible.length ? (current - 1) * PAGE_SIZE + 1 : 0

  const open = (row: Row) => (row.applicantId ? onOpenApplicant(row.applicantId) : showNotice(`${row.projectName}의 신청자 상세는 준비 중이에요`))
  const openOnEnter = (event: KeyboardEvent, row: Row) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(row) } }

  return <main className="admin-page admin-page--wide">
    <div className="admin-page-header">
      <div className="admin-page-header__text">
        <div className="admin-breadcrumb"><span>신청자</span><ChevronRightIcon width={14} height={14} /><span className="is-current">전체 신청자</span></div>
        <div className="admin-title-row"><h1>전체 신청자</h1><span className="admin-muted">프로젝트 {projectNames.length}개 · 신청자 {rows.length}명</span></div>
      </div>
    </div>

    <div className="admin-body">
      <div className="admin-toolbar">
        <label className="admin-search"><SearchIcon width={16} height={16} /><input onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="이름, 학번으로 검색" value={query} /></label>
        <label className="admin-project-filter">
          <FolderIcon width={14} height={14} />
          <select aria-label="프로젝트 필터" onChange={(event) => { setProjectName(event.target.value); setPage(1) }} value={projectName}>
            <option value={ALL}>전체 프로젝트</option>
            {projectNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <ChevronDownIcon width={14} height={14} />
        </label>
        <span className="admin-toolbar__spacer" />
      </div>

      <section className="admin-table-card">
        <table className="admin-table">
          <colgroup><col /><col className="admin-col-160" /><col className="d11-col-project" /><col className="admin-col-160" /><col className="admin-col-160" /><col className="admin-col-arrow" /></colgroup>
          <thead><tr><th>이름</th><th>학번</th><th>프로젝트</th><th>상태</th><th>최근 제출</th><th aria-label="열기" /></tr></thead>
          <tbody>
            {pageRows.map((row) => <tr aria-label={`${row.name} 상세 보기`} className={row.status === 'SUBMITTED_INCOMPLETE' ? 'is-attention' : ''} key={row.key} onClick={() => open(row)} onKeyDown={(event) => openOnEnter(event, row)} tabIndex={0}>
              <td><span className="admin-name">{row.name}{row.status === 'SUBMITTED_INCOMPLETE' && <span aria-label="미비" className="admin-red-dot" />}</span></td>
              <td className="admin-muted">{row.studentId}</td>
              <td className="admin-muted">{row.projectName}</td>
              <td><StatusBadge label={adminStatusLabels[row.status]} status={adminStatusBadge[row.status]} /></td>
              <td className={row.status === 'SUBMITTED_INCOMPLETE' ? 'admin-strong' : 'admin-muted'}>{row.lastSubmittedAt ? formatShort(row.lastSubmittedAt) : '—'}</td>
              <td className="admin-row-arrow"><ChevronRightIcon width={20} height={20} /></td>
            </tr>)}
            {pageRows.length === 0 && <tr className="admin-table__empty"><td colSpan={6}>조건에 맞는 신청자가 없어요.</td></tr>}
          </tbody>
        </table>

        <div className="admin-pagination">
          <span>{rangeStart}–{(current - 1) * PAGE_SIZE + pageRows.length} / {visible.length}명</span>
          <div className="admin-pages">
            <button aria-label="이전 페이지" className="admin-page-arrow" disabled={current === 1} onClick={() => setPage(current - 1)} type="button"><ChevronLeftIcon width={16} height={16} /></button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((number) => <button aria-current={number === current ? 'page' : undefined} className={`admin-page-number ${number === current ? 'is-active' : ''}`} key={number} onClick={() => setPage(number)} type="button">{number}</button>)}
            <button aria-label="다음 페이지" className="admin-page-arrow" disabled={current === pageCount} onClick={() => setPage(current + 1)} type="button"><ChevronRightIcon width={16} height={16} /></button>
          </div>
        </div>
      </section>
    </div>
  </main>
}
