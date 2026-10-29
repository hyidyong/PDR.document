import type { ReactNode } from 'react'
import type { AdminProject, CreatedProject } from '../api/adminApi'
import { showNotice } from '../store/noticeStore'
import { Button, CheckIcon, ChevronDownIcon, ChevronRightIcon, StatusBadge } from '../components/common'
import { ArrowRightIcon, ClockIcon, EllipsisIcon, FolderIcon, MessageIcon } from './adminIcons'
import { ProjectRowItem } from './D12ProjectList'
import { summarizeProjects } from './projectSummary'
import { adminStatusBadge, adminStatusLabels } from './mockAdminData'
import type { AdminApplicant, AdminStatus } from './mockAdminData'

const RECENT_COUNT = 5
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const pad = (value: number) => String(value).padStart(2, '0')
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
const daysLeft = (iso: string, now: Date) => Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / 86_400_000)
/** "10.31" */
const monthDay = (iso: string) => { const date = new Date(iso); return `${pad(date.getMonth() + 1)}.${pad(date.getDate())}` }
/** "10.31 (토)" */
const monthDayWeek = (iso: string) => `${monthDay(iso)} (${WEEKDAYS[new Date(iso).getDay()]})`
/** "2026. 10. 28 15:20" */
const fullTime = (iso: string) => { const date = new Date(iso); return `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}` }

function PlusIcon() {
  return <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
}

function CardHead({ title, count, extra, onMore = () => showNotice() }: { title: string; count?: string; extra?: ReactNode; onMore?: () => void }) {
  return <div className="d1-card__head">
    <div className="d1-card__title"><h2>{title}</h2>{count && <span className="d1-card__count">{count}</span>}{extra}</div>
    <button className="d1-more" onClick={onMore} type="button">전체보기<ArrowRightIcon width={16} height={16} /></button>
  </div>
}

function AiSummary({ applicant }: { applicant: AdminApplicant }) {
  const { error, review } = applicant.aiSummary
  if (!error && !review) return <span className="admin-ai admin-ai--pass">모두 통과</span>
  return <span className="admin-ai">
    {error > 0 && <span className="admin-ai--error">오류 {error}</span>}
    {error > 0 && review > 0 && <span className="admin-ai--none">·</span>}
    {review > 0 && <span className="admin-ai--review">확인 {review}</span>}
  </span>
}

// D1 담당자 홈. The 2026 창업동아리 numbers come from the live mock state (so 보완 요청·승인 on D6~D9 show up here);
// the other projects (fixed design data, and those made with 새 프로젝트 만들기) come from projectSummary.
// Every project opens its own D5 (onOpenProject); 진행 중 프로젝트 and 전체보기 open D12 프로젝트 목록.
export function D1Home({ project, applicants, createdProjects, onCreateProject, onOpenProject, onOpenProjectList, onOpenApplicant }: {
  project: AdminProject
  createdProjects: CreatedProject[]
  onCreateProject: () => void
  applicants: AdminApplicant[]
  onOpenProject: (projectId: string, tab?: 'ALL' | AdminStatus) => void
  onOpenProjectList: () => void
  onOpenApplicant: (applicantId: string) => void
}) {
  const now = new Date()
  const projects = summarizeProjects(project, applicants, createdProjects)
  const sum = (key: 'pending' | 'revision' | 'approved') => projects.reduce((total, item) => total + item[key], 0)
  const pending = sum('pending')
  const revision = sum('revision')
  const approved = sum('approved')
  const deadlines = projects.filter((row) => row.deadlineAt && daysLeft(row.deadlineAt, now) >= 0).sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt)).slice(0, 2)
  const recent = applicants.filter((applicant) => applicant.lastSubmittedAt).sort((a, b) => (b.lastSubmittedAt ?? '').localeCompare(a.lastSubmittedAt ?? '')).slice(0, RECENT_COUNT)

  const stats: { label: string; value: number; unit: string; icon: ReactNode; brand?: boolean; onOpen: () => void }[] = [
    { label: '진행 중 프로젝트', value: projects.length, unit: '개', icon: <FolderIcon />, onOpen: onOpenProjectList },
    { label: '검토 대기', value: pending, unit: '건', icon: <ClockIcon />, brand: true, onOpen: () => onOpenProject(project.id) },
    { label: '보완 요청 중', value: revision, unit: '건', icon: <MessageIcon />, onOpen: () => onOpenProject(project.id, 'NEEDS_REVISION') },
    { label: '승인 완료', value: approved, unit: '건', icon: <CheckIcon />, onOpen: () => onOpenProject(project.id, 'APPROVED') },
  ]

  return <main className="admin-page admin-page--wide d1-page">
    <section className="d1-hero">
      <div className="d1-hero__text">
        <span>나의 워크스페이스 · {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일</span>
        <h1>확인할 서류가 <em>{pending}건</em> 있어요</h1>
      </div>
      <Button onClick={onCreateProject} size="large">새 프로젝트 만들기<PlusIcon /></Button>
    </section>

    <section aria-label="요약" className="d1-stats">
      {stats.map((stat) => <button className="d1-stat" key={stat.label} onClick={stat.onOpen} type="button">
        <span className={`d1-stat__icon ${stat.brand ? 'is-brand' : ''}`}>{stat.icon}</span>
        <span className="d1-stat__text"><span>{stat.label}</span><span className="d1-stat__number"><strong>{pad(stat.value)}</strong>{stat.unit}</span></span>
        <span className="d1-stat__arrow"><ChevronRightIcon width={16} height={16} /></span>
      </button>)}
    </section>

    <div className="d1-middle">
      <section className="d1-card d1-projects">
        <CardHead count={`${projects.length}개`} onMore={onOpenProjectList} title="진행 중인 프로젝트" />
        {projects.map((row) => <ProjectRowItem key={row.id} onOpen={() => onOpenProject(row.id)} project={row} />)}
      </section>

      <section className="d1-card d1-deadlines">
        <CardHead count={`${deadlines.length}개`} onMore={onOpenProjectList} title="다가오는 마감" />
        {deadlines.map((row, index) => {
          const notSubmitted = row.total - row.submitted
          return <button className="d1-deadline" key={row.id} onClick={() => onOpenProject(row.id)} type="button">
            <span className="d1-deadline__date"><span className={`d1-chip ${index === 0 ? 'is-brand' : ''}`}><strong>D-{daysLeft(row.deadlineAt, now)}</strong></span><strong>{monthDayWeek(row.deadlineAt)}</strong></span>
            <span className="d1-deadline__divider" />
            <span className="d1-deadline__text"><strong>{row.name}</strong><span>미제출 {notSubmitted}명 · 검토 대기 {row.pending}건</span></span>
            <ChevronRightIcon width={20} height={20} />
          </button>
        })}
      </section>
    </div>

    <section className="d1-card d1-recent">
      <CardHead extra={<button className="d1-period" onClick={() => showNotice()} type="button">전체 프로젝트<ChevronDownIcon width={14} height={14} /></button>} title="최근 제출" />
      <table className="d1-table">
        <colgroup><col /><col className="d1-col-project" /><col className="d1-col-status" /><col className="d1-col-ai" /><col className="d1-col-time" /><col className="d1-col-more" /></colgroup>
        <thead><tr><th>이름</th><th>프로젝트</th><th>상태</th><th>AI 결과 요약</th><th>제출 시각</th><th aria-label="더보기" /></tr></thead>
        <tbody>
          {recent.map((applicant) => <tr aria-label={`${applicant.name} 상세 보기`} key={applicant.applicantId} onClick={() => onOpenApplicant(applicant.applicantId)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenApplicant(applicant.applicantId) } }} tabIndex={0}>
            <td><span className="d1-person"><span className="d1-avatar">{applicant.name.slice(0, 1)}</span><strong>{applicant.name}</strong></span></td>
            <td className="admin-muted">{project.name}</td>
            <td><StatusBadge label={adminStatusLabels[applicant.status]} status={adminStatusBadge[applicant.status]} /></td>
            <td><AiSummary applicant={applicant} /></td>
            <td className="admin-muted">{applicant.lastSubmittedAt && fullTime(applicant.lastSubmittedAt)}</td>
            <td><button aria-label={`${applicant.name} 더보기`} className="d1-dots" onClick={(event) => { event.stopPropagation(); showNotice() }} onKeyDown={(event) => event.stopPropagation()} type="button"><EllipsisIcon width={20} height={20} /></button></td>
          </tr>)}
        </tbody>
      </table>
    </section>
  </main>
}
