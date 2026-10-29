import { Button, ChevronRightIcon } from '../components/common'
import { PlusIcon } from './adminIcons'
import type { ProjectSummary } from './projectSummary'

const pad = (value: number) => String(value).padStart(2, '0')
/** "10.31" */
const monthDay = (iso: string) => { const date = new Date(iso); return `${pad(date.getMonth() + 1)}.${pad(date.getDate())}` }

/** One project row (D1 "진행 중인 프로젝트" and D12): 마감, 제출 진행률, 검토 대기. */
export function ProjectRowItem({ project, onOpen }: { project: ProjectSummary; onOpen: () => void }) {
  const percent = project.total ? Math.round((project.submitted / project.total) * 100) : 0
  return <button className="d1-project" onClick={onOpen} type="button">
    <span className="d1-project__name"><strong>{project.name}</strong><span>{project.org} · 신청자 {project.total}명</span></span>
    <span className="d1-project__due">{monthDay(project.deadlineAt)} 마감</span>
    <span className="d1-progress">
      <span className="d1-progress__label"><span><strong>{project.submitted}/{project.total}</strong> 제출</span><span>{percent}%</span></span>
      <span className="d1-progress__track"><span style={{ width: `${percent}%` }} /></span>
    </span>
    <span className="d1-project__pending"><span className={`d1-chip ${project.pending ? 'is-brand' : ''}`}>대기 <strong>{project.pending}</strong></span></span>
    <ChevronRightIcon className="d1-project__arrow" width={20} height={20} />
  </button>
}

// D12 프로젝트 목록 (header 프로젝트). No design frame; it reuses the D1 project card. Choosing one opens its D5.
export function D12ProjectList({ projects, onOpenProject, onCreateProject }: { projects: ProjectSummary[]; onOpenProject: (projectId: string) => void; onCreateProject: () => void }) {
  const applicants = projects.reduce((sum, project) => sum + project.total, 0)
  return <main className="admin-page admin-page--wide">
    <div className="admin-page-header">
      <div className="admin-page-header__text">
        <div className="admin-breadcrumb"><span className="is-current">프로젝트</span></div>
        <div className="admin-title-row"><h1>프로젝트</h1><span className="admin-muted">진행 중 {projects.length}개 · 신청자 {applicants}명</span></div>
      </div>
      <div className="admin-header-actions"><Button onClick={onCreateProject}><PlusIcon width={16} height={16} />새 프로젝트 만들기</Button></div>
    </div>
    <section className="d1-card d1-projects d12-list">
      {projects.map((project) => <ProjectRowItem key={project.id} onOpen={() => onOpenProject(project.id)} project={project} />)}
    </section>
  </main>
}
