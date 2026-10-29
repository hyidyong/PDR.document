import { useState } from 'react'
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
import { signOut } from './api'
import { clearSessionUser, setSessionRole, useSessionUser } from './store/sessionStore'
import { DEFAULT_PROJECT_DEADLINE, resolveProjectDeadline } from './utils/projectDeadline'

function App() {
  const [screen, setScreen] = useState<'login' | 'role' | 'applicant' | 'admin' | 'personal'>('login')
  const sessionUser = useSessionUser()
  const [verified, setVerified] = useState(false)
  const [hasVerifiedOnce, setHasVerifiedOnce] = useState(false)
  const [page, setPage] = useState<MainPage>('home')
  const [overview, setOverview] = useState(emptyFlowOverview)
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [deadlineAt, setDeadlineAt] = useState(DEFAULT_PROJECT_DEADLINE)
  const navigate = (nextPage: MainPage) => { if (verified) setPage(nextPage) }
  const logout = () => { void signOut(); clearSessionUser(); setVerified(false); setApplicant(null); setPage('home'); setScreen('login'); window.history.replaceState(null, '', '/') }
  // A2 역할 선택 after login: 서류를 받아요 → D5 (anyone, for the demo), 서류를 내요 → 신청자 서류 점검.
  // chooseApplicant throws when the account has no 신청 정보; A2 shows it and stays open.
  const chooseRole = async (role: UserRole) => {
    if (role === 'admin') { setSessionRole('admin'); setScreen('admin'); window.history.replaceState(null, '', '/admin'); return }
    const value = await chooseApplicant()
    setSessionRole('applicant', value.name); setApplicant(value); setHasVerifiedOnce(true); setVerified(true); setPage('check'); setScreen('applicant'); window.history.replaceState(null, '', '/')
  }
  if (screen === 'login') return <A1Login
    onAuthenticated={(projectDeadline) => { setDeadlineAt(resolveProjectDeadline(projectDeadline)); setScreen('role') }}
    onApplicantDemo={async (projectDeadline) => { setDeadlineAt(resolveProjectDeadline(projectDeadline)); await chooseRole('applicant') }}
    // 담당자 데모 runs on mock data without a login; the query is kept so /?reset=1 still resets it.
    onAdminDemo={() => { setDeadlineAt(DEFAULT_PROJECT_DEADLINE); setScreen('admin'); window.history.replaceState(null, '', `/admin${window.location.search}`) }}
    onPersonalCheck={() => setScreen('personal')}
  />
  if (screen === 'role') return <A2RoleSelect mode="afterLogin" onChoose={chooseRole} onLogin={logout} />
  // 모드 전환 is only offered when logged in; 담당자 데모 has no session user.
  if (screen === 'admin') return <AdminApp deadlineAt={deadlineAt} onExit={logout} onSwitchRole={sessionUser ? () => { setScreen('role'); window.history.replaceState(null, '', '/') } : undefined} />
  if (screen === 'personal') return <PersonalCheckApp onExit={() => setScreen('login')} />
  return <>
    {hasVerifiedOnce && applicant && <div hidden={!verified || (page !== 'check' && page !== 'inbox')}><DocumentCheckFlow applicantId={applicant.id} deadlineAt={deadlineAt} page={page} onNavigate={navigate} onLogout={logout} onOverviewChange={setOverview} /></div>}
    {verified && page === 'home' && <ModitHome deadlineAt={deadlineAt} overview={overview} onNavigate={navigate} onLogout={logout} />}
    {verified && page === 'guide' && <UsageGuide onNavigate={navigate} onLogout={logout} />}
  </>
}

export default App
