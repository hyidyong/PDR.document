import { useEffect, useMemo, useState } from 'react'
import { getApplicantDocuments } from '../api/adminApi'
import type { ApplicantDocuments } from '../api/adminApi'
import { AdminProvider, useAdmin } from '../store/AdminStore'
import { AdminConfirmDialog } from './AdminConfirmDialog'
import { ReadyNotice } from '../auth/ReadyNotice'
import { AdminHeader } from './AdminHeader'
import type { AdminMenu } from './AdminHeader'
import { D1Home } from './D1Home'
import { D5Dashboard } from './D5Dashboard'
import type { DashboardFilter, DashboardSort } from './D5Dashboard'
import { D6ApplicantDetail } from './D6ApplicantDetail'
import { D8DownloadModal } from './D8DownloadModal'
import { D9Approved } from './D9Approved'
import type { AdminApplicant } from './mockAdminData'
import '../screens/DocumentCheckFlow.css'
import './admin.css'

const byName = (a: AdminApplicant, b: AdminApplicant) => a.name.localeCompare(b.name, 'ko') || a.studentId.localeCompare(b.studentId)
// 최근 제출순: newest first, applicants who have not submitted last (by name among themselves).
const byRecent = (a: AdminApplicant, b: AdminApplicant) => (b.lastSubmittedAt ?? '').localeCompare(a.lastSubmittedAt ?? '') || byName(a, b)
const comparators: Record<DashboardSort, (a: AdminApplicant, b: AdminApplicant) => number> = { recent: byRecent, name: byName }

// deadlineAt comes from the login result (App); it overrides the project's own deadline.
export function AdminApp({ deadlineAt, onExit, onSwitchRole }: { deadlineAt?: string | null; onExit: () => void; onSwitchRole?: () => void }) {
  return <AdminProvider><AdminScreens deadlineAt={deadlineAt} onExit={onExit} onSwitchRole={onSwitchRole} /></AdminProvider>
}

function AdminScreens({ deadlineAt, onExit, onSwitchRole }: { deadlineAt?: string | null; onExit: () => void; onSwitchRole?: () => void }) {
  const { loading, project: storedProject, applicants, eventsById, requestRevision, approve, cancelApproval } = useAdmin()
  // 홈 = D1, 프로젝트 = D5 (D6~D9 open on top of 프로젝트).
  const [menu, setMenu] = useState<AdminMenu>('home')
  const [filter, setFilter] = useState<DashboardFilter>({ tab: 'ALL', query: '', sort: 'recent', page: 1 })
  // Kept here so the 체크박스 선택 survives a trip to D6 and back.
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [openId, setOpenId] = useState<string | null>(null)
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

  const goHome = () => { setOpenId(null); setConfirmingApproval(false) }
  const openMenu = (next: AdminMenu) => { goHome(); setMenu(next) }
  const openProject = (tab: DashboardFilter['tab'] = 'ALL') => { openMenu('project'); setFilter({ ...filter, tab, page: 1 }) }
  const openApplicant = (applicantId: string) => { setMenu('project'); setOpenId(applicantId) }
  const move = (step: number) => setOpenId(sorted[(index + step + sorted.length) % sorted.length].applicantId)
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
      : <D6ApplicantDetail {...shared} key={current.applicantId} onApprove={() => setConfirmingApproval(true)} onRequestRevision={(comment, attachAi) => requestRevision(current.applicantId, { comment, attachAi })} />
  }

  return <div className="admin-app">
    <AdminHeader active={menu} onExit={onExit} onNavigate={openMenu} onSwitchRole={onSwitchRole} />
    <ReadyNotice />
    <div className="admin-integration-notice" role="status"><strong>디자인 미리보기</strong> 관리자 API가 아직 연결되지 않아 아래 현황·보완 요청·승인 동작은 mock 데이터로만 표시됩니다.</div>
    {loading || !project
      ? null
      : current
        ? detail()
        : menu === 'home'
          ? <D1Home applicants={applicants} onOpenApplicant={openApplicant} onOpenProject={openProject} project={project} />
          : <D5Dashboard applicants={sorted} filter={filter} onDownload={() => setDownloadOpen(true)} onFilterChange={setFilter} onOpen={setOpenId} onSelectedChange={setSelected} project={project} selected={selected} />}
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
