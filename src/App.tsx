import { useEffect, useState } from 'react'
import { A1Login } from './auth/A1Login'
import { A2RoleSelect } from './auth/A2RoleSelect'
import { chooseApplicant } from './api/authApi'
import type { UserRole } from './api/authApi'
import { AdminApp } from './admin/AdminApp'
import { PersonalCheckApp } from './personal/PersonalCheckApp'
import { DocumentCheckFlow } from './screens/DocumentCheckFlow'
import type { MainPage } from './components/common'
import { emptyFlowOverview } from './screens/checkModel'
import { ModitHome } from './screens/ModitHome'
import { UsageGuide } from './screens/UsageGuide'
import type { Applicant } from './api'
import { resolveCurrentSession, signOut } from './api'
import { defaultAdminNav, pushNav, replaceNav, usePopNav } from './store/navHistory'
import type { AppScreen } from './store/navHistory'
import { clearSessionUser, getSessionUser, setSessionRole, setSessionUser } from './store/sessionStore'

import { DEFAULT_PROJECT_DEADLINE, resolveProjectDeadline } from './utils/projectDeadline'
import { supabase } from './supabase'

function App() {
  const [screen, setScreen] = useState<AppScreen>('login')
  const [verified, setVerified] = useState(false)
  const [hasVerifiedOnce, setHasVerifiedOnce] = useState(false)
  const [page, setPage] = useState<MainPage>('home')
  const [overview, setOverview] = useState(emptyFlowOverview)
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [deadlineAt, setDeadlineAt] = useState(DEFAULT_PROJECT_DEADLINE)
  // Screen changes are recorded in the browser history (src/store/navHistory.ts) so 뒤로가기 works.
  usePopNav((state) => {
    const next = state ?? { screen: 'login' }
    const loggedIn = getSessionUser() !== null
    // After 로그아웃 the old entries are still in the history; they lead back to A1 instead (담당자 데모 needs no login).
    if (!loggedIn && (next.screen === 'role' || next.screen === 'applicant' || next.screen === 'personal' || (next.screen === 'admin' && !next.demo))) { setScreen('login'); replaceNav({ screen: 'login' }, '/'); return }
    // Logged in, 뒤로가기 stops at A2 and never shows A1 again.
    if (loggedIn && next.screen === 'login') { setScreen('role'); replaceNav({ screen: 'role' }, '/'); return }
    if (next.screen === 'applicant' && !applicant) { setScreen('role'); replaceNav({ screen: 'role' }, '/'); return }
    if (next.page) setPage(next.page)
    setScreen(next.screen)
  })
  const navigate = (nextPage: MainPage) => { if (verified && nextPage !== page) { setPage(nextPage); pushNav({ screen: 'applicant', page: nextPage }) } }
  const openPersonalCheck = () => { if (verified && getSessionUser()) { setScreen('personal'); pushNav({ screen: 'personal' }) } }
  // The A1 entry was replaced by A2 at login, so after 로그아웃 this entry becomes A1 again and the rest are redirected by usePopNav.
  const logout = () => { void signOut(); clearSessionUser(); setVerified(false); setApplicant(null); setPage('home'); setScreen('login'); replaceNav({ screen: 'login' }, '/') }
  // A2 역할 선택 after login: both roles start on their home — 서류를 받아요 → D1 (anyone, for the demo), 서류를 내요 → 신청자 홈.
  // chooseApplicant throws when the account has no 신청 정보; A2 shows it and stays open.
  // fromLogin ([사용자 데모]) records A2 in place of A1 first, so 뒤로가기 goes to A2 as after a normal login.
  const chooseRole = async (role: UserRole, fromLogin = false) => {
    // The query is kept so /?reset=1 also resets the 시연 데이터 on this path.
    if (role === 'admin') { setSessionRole('admin'); setScreen('admin'); pushNav({ screen: 'admin', admin: defaultAdminNav }, `/admin${window.location.search}`); return }
    const value = await chooseApplicant()
    if (fromLogin) replaceNav({ screen: 'role' }, '/')
    setSessionRole('applicant', value.name); setApplicant(value); setHasVerifiedOnce(true); setVerified(true); setPage('home'); setScreen('applicant'); pushNav({ screen: 'applicant', page: 'home' }, '/')
  }
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let active = true
    let signedOut = false
    clearSessionUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!active || event !== 'SIGNED_OUT') return
      signedOut = true
      clearSessionUser()
      setVerified(false)
      setApplicant(null)
      setPage('home')
      setScreen('login')
      replaceNav({ screen: 'login' }, '/')
    })
    resolveCurrentSession()
      .then(async (result) => {
        if (!active || signedOut) return
        if (!result) { replaceNav({ screen: 'login' }); return }
        const { data } = await supabase.auth.getSession()
        if (!active || signedOut || !data.session) return
        setSessionUser({ email: data.session.user.email ?? '', name: result.kind === 'applicant' ? result.applicant.name : '담당자', role: result.kind })
        replaceNav({ screen: 'role' })
        setDeadlineAt(resolveProjectDeadline(result.project.deadlineAt))
        if (result.kind === 'admin') {
          setScreen('admin')
          pushNav({ screen: 'admin', admin: defaultAdminNav }, '/admin')
          return
        }
        setApplicant(result.applicant)
        setHasVerifiedOnce(true)
        setVerified(true)
        setPage('check')
        setScreen('applicant')
        pushNav({ screen: 'applicant', page: 'check' }, '/')
      })
      .catch(() => { /* Keep the valid login screen when session restoration fails. */ })
      .finally(() => { if (active) setAuthReady(true) })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  if (!authReady) return null
  if (screen === 'login') return <A1Login
    onAuthenticated={(projectDeadline) => { setDeadlineAt(resolveProjectDeadline(projectDeadline)); setScreen('role'); replaceNav({ screen: 'role' }) }}
    onApplicantDemo={async (projectDeadline) => { setDeadlineAt(resolveProjectDeadline(projectDeadline)); await chooseRole('applicant', true) }}
    // 담당자 데모 runs on mock data without a login; the query is kept so /?reset=1 still resets it.
    onAdminDemo={() => { setDeadlineAt(DEFAULT_PROJECT_DEADLINE); setScreen('admin'); pushNav({ screen: 'admin', demo: true, admin: defaultAdminNav }, `/admin${window.location.search}`) }}
  />
  if (screen === 'role') return <A2RoleSelect mode="afterLogin" onChoose={(role) => chooseRole(role)} onLogin={logout} />
  if (screen === 'admin') return <AdminApp deadlineAt={deadlineAt} onExit={logout} />
  // 나가기 goes back to the A1 entry it was opened from.
  if (screen === 'personal') return <PersonalCheckApp onExit={() => window.history.back()} />
  return <>
    {hasVerifiedOnce && applicant && <div hidden={!verified || (page !== 'check' && page !== 'inbox')}><DocumentCheckFlow applicantId={applicant.id} deadlineAt={deadlineAt} page={page} onNavigate={navigate} onLogout={logout} onOverviewChange={setOverview} /></div>}
    {verified && page === 'home' && <ModitHome deadlineAt={deadlineAt} overview={overview} onNavigate={navigate} onPersonalCheck={openPersonalCheck} onLogout={logout} />}
    {verified && page === 'guide' && <UsageGuide onNavigate={navigate} onLogout={logout} />}
  </>
}

export default App
