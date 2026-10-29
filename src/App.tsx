import { useState } from 'react'
import { A1Login } from './auth/A1Login'
import { AdminApp } from './admin/AdminApp'
import { PersonalCheckApp } from './personal/PersonalCheckApp'
import { DocumentCheckFlow } from './screens/DocumentCheckFlow'
import type { MainPage } from './components/common'
import { emptyFlowOverview } from './screens/checkModel'
import { ModitHome } from './screens/ModitHome'
import { UsageGuide } from './screens/UsageGuide'
import type { Applicant } from './api'
import { signOut } from './api'
import { DEFAULT_PROJECT_DEADLINE, resolveProjectDeadline } from './utils/projectDeadline'

function App() {
  const [screen, setScreen] = useState<'login' | 'applicant' | 'admin' | 'personal'>('login')
  const [verified, setVerified] = useState(false)
  const [hasVerifiedOnce, setHasVerifiedOnce] = useState(false)
  const [page, setPage] = useState<MainPage>('home')
  const [overview, setOverview] = useState(emptyFlowOverview)
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [deadlineAt, setDeadlineAt] = useState(DEFAULT_PROJECT_DEADLINE)
  const navigate = (nextPage: MainPage) => { if (verified) setPage(nextPage) }
  const logout = () => { void signOut(); setVerified(false); setApplicant(null); setPage('home'); setScreen('login'); window.history.replaceState(null, '', '/') }
  if (screen === 'login') return <A1Login
    onAdminAuthenticated={(projectDeadline) => { setDeadlineAt(resolveProjectDeadline(projectDeadline)); setScreen('admin'); window.history.replaceState(null, '', '/admin') }}
    onApplicantAuthenticated={(value, projectDeadline) => { setDeadlineAt(resolveProjectDeadline(projectDeadline)); setApplicant(value); setHasVerifiedOnce(true); setVerified(true); setPage('check'); setScreen('applicant'); window.history.replaceState(null, '', '/') }}
    onPersonalCheck={() => setScreen('personal')}
  />
  if (screen === 'admin') return <AdminApp deadlineAt={deadlineAt} onExit={logout} />
  if (screen === 'personal') return <PersonalCheckApp onExit={() => setScreen('login')} />
  return <>
    {hasVerifiedOnce && applicant && <div hidden={!verified || (page !== 'check' && page !== 'inbox')}><DocumentCheckFlow applicantId={applicant.id} deadlineAt={deadlineAt} page={page} onNavigate={navigate} onLogout={logout} onOverviewChange={setOverview} /></div>}
    {verified && page === 'home' && <ModitHome deadlineAt={deadlineAt} overview={overview} onNavigate={navigate} onLogout={logout} />}
    {verified && page === 'guide' && <UsageGuide onNavigate={navigate} onLogout={logout} />}
  </>
}

export default App
