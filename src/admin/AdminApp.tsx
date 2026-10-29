import { useMemo, useState } from 'react'
import { AdminHeader } from './AdminHeader'
import { D5Dashboard } from './D5Dashboard'
import type { DashboardFilter } from './D5Dashboard'
import { D6ApplicantDetail } from './D6ApplicantDetail'
import { mockApplicants, seedEvents, toLocalIso } from './mockAdminData'
import type { AdminApplicant, AdminEvent } from './mockAdminData'
import '../screens/DocumentCheckFlow.css'
import './admin.css'

// 최근 제출순: newest first, applicants who have not submitted last.
const byRecent = (a: AdminApplicant, b: AdminApplicant) => (b.lastSubmittedAt ?? '').localeCompare(a.lastSubmittedAt ?? '')

export function AdminApp({ deadlineAt, onExit }: { deadlineAt?: string | null; onExit: () => void }) {
  const [applicants, setApplicants] = useState(mockApplicants)
  const [events, setEvents] = useState<Record<string, AdminEvent[]>>(() => Object.fromEntries(mockApplicants.map((applicant) => [applicant.applicantId, seedEvents(applicant)])))
  const [filter, setFilter] = useState<DashboardFilter>({ tab: 'ALL', query: '', page: 1 })
  const [openId, setOpenId] = useState<string | null>(null)
  const sorted = useMemo(() => [...applicants].sort(byRecent), [applicants])

  const update = (applicantId: string, status: AdminApplicant['status'], event: AdminEvent) => {
    setApplicants((current) => current.map((applicant) => applicant.applicantId === applicantId ? { ...applicant, status } : applicant))
    setEvents((current) => ({ ...current, [applicantId]: [...current[applicantId], event] }))
  }
  const requestRevision = (applicantId: string, comment: string) => update(applicantId, 'NEEDS_REVISION', { kind: 'revision', at: toLocalIso(new Date()), label: '보완 요청', tone: 'error', comment })
  const approve = (applicantId: string) => update(applicantId, 'APPROVED', { kind: 'approved', at: toLocalIso(new Date()), label: '승인 완료', tone: 'navy' })

  const goHome = () => setOpenId(null)
  const index = sorted.findIndex((applicant) => applicant.applicantId === openId)
  const current = index >= 0 ? sorted[index] : null

  return <div className="admin-app">
    <AdminHeader onExit={onExit} onHome={goHome} />
    <div className="admin-integration-notice" role="status"><strong>디자인 미리보기</strong> 관리자 API가 아직 연결되지 않아 아래 현황·보완 요청·승인 동작은 mock 데이터로만 표시됩니다.</div>
    {current
      ? <D6ApplicantDetail
          applicant={current}
          events={events[current.applicantId]}
          key={current.applicantId}
          onApprove={() => approve(current.applicantId)}
          onBack={goHome}
          onMove={(step) => setOpenId(sorted[(index + step + sorted.length) % sorted.length].applicantId)}
          onRequestRevision={(comment) => requestRevision(current.applicantId, comment)}
          position={index + 1}
          total={sorted.length}
        />
      : <D5Dashboard applicants={sorted} deadlineAt={deadlineAt} filter={filter} onFilterChange={setFilter} onOpen={setOpenId} />}
  </div>
}
