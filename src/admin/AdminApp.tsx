import { useEffect, useMemo, useState } from 'react'
import { getApplicantDocuments } from '../api/adminApi'
import type { ApplicantDocuments } from '../api/adminApi'
import { AdminProvider, useAdmin } from '../store/AdminStore'
import { currentNav, defaultAdminNav, pushNav, replaceNav, usePopNav } from '../store/navHistory'
import type { AdminNav } from '../store/navHistory'
import { AdminConfirmDialog } from './AdminConfirmDialog'
import { ReadyNotice } from '../auth/ReadyNotice'
import { AdminHeader } from './AdminHeader'
import type { AdminMenu } from './AdminHeader'
import { D1Home } from './D1Home'
import { D10DocumentStatus } from './D10DocumentStatus'
import { D11AllApplicants } from './D11AllApplicants'
import { D5Dashboard } from './D5Dashboard'
import type { DashboardFilter, DashboardSort } from './D5Dashboard'
import { D6ApplicantDetail } from './D6ApplicantDetail'
import { D8DownloadModal } from './D8DownloadModal'
import { D9Approved } from './D9Approved'
import { ProjectWizard } from './ProjectWizard'
import { emptyDraft, toProjectInput } from './projectDraft'
import type { WizardStep } from './projectDraft'
import type { AdminApplicant } from './mockAdminData'
import '../screens/DocumentCheckFlow.css'
import './admin.css'

const byName = (a: AdminApplicant, b: AdminApplicant) => a.name.localeCompare(b.name, 'ko') || a.studentId.localeCompare(b.studentId)
// 최근 제출순: newest first, applicants who have not submitted last (by name among themselves).
const byRecent = (a: AdminApplicant, b: AdminApplicant) => (b.lastSubmittedAt ?? '').localeCompare(a.lastSubmittedAt ?? '') || byName(a, b)
const comparators: Record<DashboardSort, (a: AdminApplicant, b: AdminApplicant) => number> = { recent: byRecent, name: byName }
// The yellow "디자인 미리보기" banner (담당자 화면 is mock data). Hidden for the demo; set to true to show it again.
const SHOW_MOCK_BANNER = false

// deadlineAt comes from the login result (App); it overrides the project's own deadline.
export function AdminApp({ deadlineAt, onExit }: { deadlineAt?: string | null; onExit: () => void }) {
  return <AdminProvider><AdminScreens deadlineAt={deadlineAt} onExit={onExit} /></AdminProvider>
}

function AdminScreens({ deadlineAt, onExit }: { deadlineAt?: string | null; onExit: () => void }) {
  const { loading, project: storedProject, applicants, eventsById, createdProjects, createProject, requestRevision, approve, cancelApproval } = useAdmin()
  // 홈 = D1, 프로젝트 = D5, 신청자 = D11, 서류 관리 = D10. D6~D9 open on top; the header keeps the menu it came from.
  // menu, the open 신청자 and D7 are recorded in the browser history (src/store/navHistory.ts); entering by 뒤로가기 restores them.
  const [initialNav] = useState(() => currentNav()?.admin ?? defaultAdminNav)
  const [menu, setMenu] = useState<AdminMenu>(initialNav.menu)
  const [revisionOpen, setRevisionOpen] = useState(initialNav.revision)
  // 새 프로젝트 만들기: the step is in the history; the draft stays here so [이전]/[다음] and 뒤로가기 keep what was typed.
  const [wizardStep, setWizardStep] = useState<WizardStep | undefined>(initialNav.wizardStep)
  const [draft, setDraft] = useState(emptyDraft)
  const [filter, setFilter] = useState<DashboardFilter>({ tab: 'ALL', query: '', sort: 'recent', page: 1 })
  // Kept here so the 체크박스 선택 survives a trip to D6 and back.
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [openId, setOpenId] = useState<string | null>(initialNav.openId)
  const [documents, setDocuments] = useState<{ applicantId: string; data: ApplicantDocuments } | null>(null)
  const [confirmingApproval, setConfirmingApproval] = useState(false)
  const [approving, setApproving] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const sorted = useMemo(() => [...applicants].sort(comparators[filter.sort]), [applicants, filter.sort])
  const project = useMemo(() => storedProject && deadlineAt ? { ...storedProject, deadlineAt } : storedProject, [storedProject, deadlineAt])

  const index = sorted.findIndex((applicant) => applicant.applicantId === openId)
  const current = index >= 0 ? sorted[index] : null
  const currentId = current?.applicantId

  useEffect(() => {
    if (!currentId) return
    let active = true
    getApplicantDocuments(currentId)
      .then((data) => { if (active) setDocuments({ applicantId: currentId, data }) })
      .catch((error) => console.error(error))
    return () => { active = false }
  }, [currentId])

  const show = (next: AdminNav) => { setMenu(next.menu); setOpenId(next.openId); setRevisionOpen(next.revision); setWizardStep(next.wizardStep); setConfirmingApproval(false); setDownloadOpen(false) }
  const go = (next: AdminNav) => { show(next); pushNav({ ...(currentNav() ?? { screen: 'admin' }), admin: next }) }
  usePopNav((state) => { if (state?.screen === 'admin') show(state.admin ?? defaultAdminNav) })

  const goHome = () => go({ menu, openId: null, revision: false })
  const openMenu = (next: AdminMenu) => go({ menu: next, openId: null, revision: false })
  const openProject = (tab: DashboardFilter['tab'] = 'ALL') => { openMenu('project'); setFilter({ ...filter, tab, page: 1 }) }
  const openApplicant = (applicantId: string) => go({ menu: menu === 'home' ? 'project' : menu, openId: applicantId, revision: false })
  // 이전/다음 신청자 replaces the entry, so 뒤로가기 from D6 returns to the list.
  const move = (step: number) => {
    const next = { menu, openId: sorted[(index + step + sorted.length) % sorted.length].applicantId, revision: false }
    show(next)
    replaceNav({ ...(currentNav() ?? { screen: 'admin' }), admin: next })
  }
  // D7 opens as its own entry; closing it (취소 or 보내기) goes back to that D6 entry.
  const changeRevision = (open: boolean) => {
    if (open) go({ menu, openId, revision: true })
    else if (currentNav()?.admin?.revision) window.history.back()
    else setRevisionOpen(false)
  }
  // A finished draft is not reopened: [새 프로젝트 만들기] starts empty again.
  const openWizard = () => { if (draft.created) setDraft(emptyDraft()); go({ menu: 'project', openId: null, revision: false, wizardStep: 1 }) }
  // [다음] pushes the next step; [이전], the stepper and [취소] go back through those entries, so 뒤로가기 matches [이전].
  const wizardTo = (step: WizardStep) => go({ menu, openId: null, revision: false, wizardStep: step })
  const wizardBack = (step: WizardStep | 0) => window.history.go(step - (wizardStep ?? 1))
  const createFromDraft = async () => {
    const created = await createProject(toProjectInput(draft))
    setDraft({ ...draft, created })
    wizardTo(4)
  }
  const finishWizard = () => { setDraft(emptyDraft()); openMenu('home') }
  const confirmApproval = async () => {
    if (!current) return
    setApproving(true)
    try {
      await approve(current.applicantId)
      setConfirmingApproval(false)
    } catch (error) {
      console.error(error)
    } finally {
      setApproving(false)
    }
  }

  const currentDocuments = current && documents?.applicantId === current.applicantId ? documents.data : null
  const detail = () => {
    if (!project || !current || !currentDocuments) return null
    const shared = { applicant: current, documents: currentDocuments, events: eventsById[current.applicantId] ?? [], onBack: goHome, onMove: move, position: index + 1, project, total: sorted.length }
    // An approved applicant opens on D9; 승인 취소 brings them back to D6.
    return current.status === 'APPROVED'
      ? <D9Approved {...shared} key={current.applicantId} onCancelApproval={() => cancelApproval(current.applicantId)} />
      : <D6ApplicantDetail {...shared} key={current.applicantId} onApprove={() => setConfirmingApproval(true)} onRevisionOpenChange={changeRevision} revisionOpen={revisionOpen} onRequestRevision={(comment, attachAi) => requestRevision(current.applicantId, { comment, attachAi })} />
  }

  return <div className="admin-app">
    <AdminHeader active={menu} onExit={onExit} onNavigate={openMenu} onOpenApplicant={openApplicant} />
    <ReadyNotice />
    {SHOW_MOCK_BANNER && <div className="admin-integration-notice" role="status"><strong>디자인 미리보기</strong> 관리자 API가 아직 연결되지 않아 아래 현황·보완 요청·승인 동작은 mock 데이터로만 표시됩니다.</div>}
    {loading || !project
      ? null
      : wizardStep
        ? <ProjectWizard draft={draft} onBack={wizardBack} onCreate={createFromDraft} onDone={finishWizard} onDraftChange={setDraft} onNext={wizardTo} step={wizardStep} />
      : current
        ? detail()
        : menu === 'home'
          ? <D1Home applicants={applicants} createdProjects={createdProjects} onCreateProject={openWizard} onOpenApplicant={openApplicant} onOpenProject={openProject} project={project} />
          : menu === 'documents'
            ? <D10DocumentStatus applicants={applicants} onOpenProject={() => openProject()} project={project} />
          : menu === 'applicants'
            ? <D11AllApplicants applicants={applicants} createdProjects={createdProjects} onOpenApplicant={openApplicant} project={project} />
            : <D5Dashboard applicants={sorted} filter={filter} onDownload={() => setDownloadOpen(true)} onFilterChange={setFilter} onOpen={openApplicant} onSelectedChange={setSelected} project={project} selected={selected} />}
    {downloadOpen && project && <D8DownloadModal applicants={sorted} onClose={() => setDownloadOpen(false)} project={project} selected={selected} />}
    {confirmingApproval && current && <AdminConfirmDialog
      busy={approving}
      confirmLabel="승인하기"
      description="승인하면 신청자에게 이메일로 알려드려요. 승인한 뒤에도 승인 취소할 수 있어요."
      onCancel={() => setConfirmingApproval(false)}
      onConfirm={confirmApproval}
      title={`${current.name}님의 서류를 승인할까요?`}
    />}
  </div>
}
