// Shares admin (담당자) data between screens so a change made in D6 shows up in D5 right away.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as adminApi from '../api/adminApi'
import type { AdminChange, AdminProject, CreatedProject, NewProjectInput, RevisionInput } from '../api/adminApi'
import type { AdminApplicant, AdminEvent } from '../admin/mockAdminData'

type AdminStore = {
  loading: boolean
  project: AdminProject | null
  applicants: AdminApplicant[]
  eventsById: Record<string, AdminEvent[]>
  createdProjects: CreatedProject[]
  notificationsReadAt: string | null
  markNotificationsRead: () => Promise<void>
  createProject: (input: NewProjectInput) => Promise<CreatedProject>
  requestRevision: (applicantId: string, input: RevisionInput) => Promise<void>
  approve: (applicantId: string) => Promise<void>
  cancelApproval: (applicantId: string) => Promise<void>
}

const AdminStoreContext = createContext<AdminStore | null>(null)

// "/admin?reset=1" resets the 시연 데이터, then drops the parameter from the address.
function consumeResetParam() {
  const url = new URL(window.location.href)
  if (url.searchParams.get('reset') !== '1') return false
  url.searchParams.delete('reset')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  return true
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<AdminProject | null>(null)
  const [applicants, setApplicants] = useState<AdminApplicant[]>([])
  const [eventsById, setEventsById] = useState<Record<string, AdminEvent[]>>({})
  const [createdProjects, setCreatedProjects] = useState<CreatedProject[]>([])
  const [notificationsReadAt, setNotificationsReadAt] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const reset = consumeResetParam()
    const load = async () => {
      if (reset) await adminApi.resetDemo()
      const [nextProject, nextApplicants, nextEvents, nextCreated, nextReadAt] = await Promise.all([adminApi.getProject(), adminApi.getApplicants(), adminApi.getAllEvents(), adminApi.getCreatedProjects(), adminApi.getNotificationsReadAt()])
      if (!active) return
      setProject(nextProject)
      setApplicants(nextApplicants)
      setEventsById(nextEvents)
      setCreatedProjects(nextCreated)
      setNotificationsReadAt(nextReadAt)
      setLoading(false)
    }
    load().catch((error) => {
      console.error(error)
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const apply = useCallback(({ applicant, events }: AdminChange) => {
    setApplicants((current) => current.map((item) => item.applicantId === applicant.applicantId ? applicant : item))
    setEventsById((current) => ({ ...current, [applicant.applicantId]: events }))
  }, [])

  const requestRevision = useCallback(async (applicantId: string, input: RevisionInput) => apply(await adminApi.requestRevision(applicantId, input)), [apply])
  const approve = useCallback(async (applicantId: string) => apply(await adminApi.approve(applicantId)), [apply])
  const createProject = useCallback(async (input: NewProjectInput) => {
    const project = await adminApi.createProject(input)
    setCreatedProjects((current) => [...current, project])
    return project
  }, [])
  const markNotificationsRead = useCallback(async () => setNotificationsReadAt(await adminApi.markNotificationsRead()), [])
  const cancelApproval = useCallback(async (applicantId: string) => apply(await adminApi.cancelApproval(applicantId)), [apply])

  const value = useMemo(() => ({ loading, project, applicants, eventsById, createdProjects, createProject, notificationsReadAt, markNotificationsRead, requestRevision, approve, cancelApproval }), [loading, project, applicants, eventsById, createdProjects, createProject, notificationsReadAt, markNotificationsRead, requestRevision, approve, cancelApproval])
  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin() {
  const store = useContext(AdminStoreContext)
  if (!store) throw new Error('useAdmin must be used inside AdminProvider')
  return store
}
