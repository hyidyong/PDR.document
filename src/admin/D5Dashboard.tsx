import { useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { Button, CheckIcon, ChevronDownIcon, ChevronRightIcon, StatusBadge } from '../components/common'
import { ChevronLeftIcon, ClockIcon, DownloadIcon, LinkIcon, SearchIcon, SortIcon } from './adminIcons'
import { adminProject, adminStatusBadge, adminStatusLabels, adminStatusOrder, formatShort } from './mockAdminData'
import type { AdminApplicant, AdminStatus } from './mockAdminData'
import { formatDeadlineBadge } from '../utils/projectDeadline'

export type DashboardFilter = { tab: 'ALL' | AdminStatus; query: string; page: number }

const PAGE_SIZE = 10

function AiResult({ applicant }: { applicant: AdminApplicant }) {
  const { error, review } = applicant.aiSummary
  if (!applicant.lastSubmittedAt) return <span className="admin-ai admin-ai--none">—</span>
  if (!error && !review) return <span className="admin-ai admin-ai--pass">통과</span>
  return <span className="admin-ai">
    {error > 0 && <span className="admin-ai--error">오류 {error}</span>}
    {error > 0 && review > 0 && <span className="admin-ai--none">·</span>}
    {review > 0 && <span className="admin-ai--review">확인 {review}</span>}
  </span>
}

function Checkbox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  const toggle = (event: MouseEvent) => { event.stopPropagation(); onToggle() }
  return <button aria-checked={checked} aria-label={label} className={`admin-checkbox ${checked ? 'is-checked' : ''}`} onClick={toggle} onKeyDown={(event) => event.stopPropagation()} role="checkbox" type="button">{checked && <CheckIcon width={12} height={12} />}</button>
}

export function D5Dashboard({ applicants, deadlineAt, filter, onFilterChange, onOpen }: { applicants: AdminApplicant[]; deadlineAt?: string | null; filter: DashboardFilter; onFilterChange: (filter: DashboardFilter) => void; onOpen: (applicantId: string) => void }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const query = filter.query.trim()
  const searched = applicants.filter((applicant) => !query || applicant.name.includes(query) || applicant.studentId.includes(query))
  const visible = filter.tab === 'ALL' ? searched : searched.filter((applicant) => applicant.status === filter.tab)
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const page = Math.min(filter.page, pageCount)
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((applicant) => selected.has(applicant.applicantId))

  const tabs: { key: DashboardFilter['tab']; label: string; count: number }[] = [
    { key: 'ALL', label: '전체', count: searched.length },
    ...adminStatusOrder.map((status) => ({ key: status, label: adminStatusLabels[status], count: searched.filter((applicant) => applicant.status === status).length })),
  ]

  const toggle = (applicantId: string) => setSelected((current) => {
    const next = new Set(current)
    if (next.has(applicantId)) next.delete(applicantId)
    else next.add(applicantId)
    return next
  })
  const togglePage = () => setSelected((current) => {
    const next = new Set(current)
    pageRows.forEach((applicant) => allOnPageSelected ? next.delete(applicant.applicantId) : next.add(applicant.applicantId))
    return next
  })
  const openOnEnter = (event: KeyboardEvent, applicantId: string) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(applicantId) } }
  const rangeStart = visible.length ? (page - 1) * PAGE_SIZE + 1 : 0

  return <main className="admin-page admin-page--wide">
    <div className="admin-page-header">
      <div className="admin-page-header__text">
        <div className="admin-breadcrumb"><span>프로젝트</span><ChevronRightIcon width={14} height={14} /><span className="is-current">{adminProject.name}</span></div>
        <div className="admin-title-row"><h1>{adminProject.name}</h1><span className="admin-deadline"><ClockIcon width={14} height={14} />{formatDeadlineBadge(deadlineAt)}</span></div>
      </div>
      <div className="admin-header-actions">
        <button className="admin-text-button" type="button"><LinkIcon width={16} height={16} />제출 링크 관리</button>
        <Button variant="secondary"><DownloadIcon width={16} height={16} />ZIP 다운로드</Button>
      </div>
    </div>

    <div className="admin-body">
      <div className="admin-status-tabs" role="tablist" aria-label="상태 필터">
        {tabs.map((tab) => <button aria-selected={filter.tab === tab.key} className={`admin-status-tab ${filter.tab === tab.key ? 'is-active' : ''}`} key={tab.key} onClick={() => onFilterChange({ ...filter, tab: tab.key, page: 1 })} role="tab" type="button">
          {tab.label}<span className="admin-status-tab__count">{tab.count}</span>
        </button>)}
      </div>

      <div className="admin-toolbar">
        <label className="admin-search"><SearchIcon width={16} height={16} /><input onChange={(event) => onFilterChange({ ...filter, query: event.target.value, page: 1 })} placeholder="이름, 학번으로 검색" value={filter.query} /></label>
        <button className="admin-sort" type="button"><SortIcon width={14} height={14} /><span>최근 제출순</span><ChevronDownIcon width={14} height={14} /></button>
        <span className="admin-toolbar__spacer" />
        {selected.size > 0 && <span className="admin-selection"><strong>{selected.size}명 선택됨</strong><button onClick={() => setSelected(new Set())} type="button">· 선택 해제</button></span>}
      </div>

      <section className="admin-table-card">
        <table className="admin-table">
          <colgroup><col className="admin-col-check" /><col /><col className="admin-col-160" /><col className="admin-col-160" /><col className="admin-col-200" /><col className="admin-col-160" /><col className="admin-col-arrow" /></colgroup>
          <thead><tr>
            <th><Checkbox checked={allOnPageSelected} label="현재 페이지 전체 선택" onToggle={togglePage} /></th>
            <th>이름</th><th>학번</th><th>상태</th><th>AI 결과</th><th>최근 제출</th><th aria-label="열기" />
          </tr></thead>
          <tbody>
            {pageRows.map((applicant) => <tr aria-label={`${applicant.name} 상세 보기`} className={applicant.status === 'SUBMITTED_INCOMPLETE' ? 'is-attention' : ''} key={applicant.applicantId} onClick={() => onOpen(applicant.applicantId)} onKeyDown={(event) => openOnEnter(event, applicant.applicantId)} tabIndex={0}>
              <td><Checkbox checked={selected.has(applicant.applicantId)} label={`${applicant.name} 선택`} onToggle={() => toggle(applicant.applicantId)} /></td>
              <td><span className="admin-name">{applicant.name}{applicant.status === 'SUBMITTED_INCOMPLETE' && <span aria-label="미비" className="admin-red-dot" />}</span></td>
              <td className="admin-muted">{applicant.studentId}</td>
              <td><StatusBadge status={adminStatusBadge[applicant.status]} label={adminStatusLabels[applicant.status]} /></td>
              <td><AiResult applicant={applicant} /></td>
              <td className={applicant.status === 'SUBMITTED_INCOMPLETE' ? 'admin-strong' : 'admin-muted'}>{applicant.lastSubmittedAt ? formatShort(applicant.lastSubmittedAt) : '—'}</td>
              <td className="admin-row-arrow"><ChevronRightIcon width={20} height={20} /></td>
            </tr>)}
            {pageRows.length === 0 && <tr className="admin-table__empty"><td colSpan={7}>조건에 맞는 신청자가 없어요.</td></tr>}
          </tbody>
        </table>

        <div className="admin-pagination">
          <span>{rangeStart}–{(page - 1) * PAGE_SIZE + pageRows.length} / {visible.length}명</span>
          <div className="admin-pages">
            <button aria-label="이전 페이지" className="admin-page-arrow" disabled={page === 1} onClick={() => onFilterChange({ ...filter, page: page - 1 })} type="button"><ChevronLeftIcon width={16} height={16} /></button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((number) => <button aria-current={number === page ? 'page' : undefined} className={`admin-page-number ${number === page ? 'is-active' : ''}`} key={number} onClick={() => onFilterChange({ ...filter, page: number })} type="button">{number}</button>)}
            <button aria-label="다음 페이지" className="admin-page-arrow" disabled={page === pageCount} onClick={() => onFilterChange({ ...filter, page: page + 1 })} type="button"><ChevronRightIcon width={16} height={16} /></button>
          </div>
        </div>
      </section>
    </div>
  </main>
}
