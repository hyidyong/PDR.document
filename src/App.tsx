import { useEffect, useState } from 'react'
import { AdminApp } from './admin/AdminApp'
import { A1Login } from './auth/A1Login'
import { PersonalCheckApp } from './personal/PersonalCheckApp'
import { B1EntryScreen } from './screens/B1EntryScreen'
import { DocumentCheckFlow } from './screens/DocumentCheckFlow'
import type { MainPage } from './components/common'
import { emptyFlowOverview } from './screens/checkModel'
import { ModitHome } from './screens/ModitHome'
import { UsageGuide } from './screens/UsageGuide'

type Screen = 'login' | 'applicant' | 'personal'

function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [verified, setVerified] = useState(false)
  const [hasVerifiedOnce, setHasVerifiedOnce] = useState(false)
  const [page, setPage] = useState<MainPage>('home')
  const [overview, setOverview] = useState(emptyFlowOverview)
  const navigate = (nextPage: MainPage) => { if (verified) setPage(nextPage) }
  const logout = () => { setVerified(false); setPage('home'); setScreen('login') }
  const [isAdmin, setIsAdmin] = useState(() => window.location.pathname === '/admin')
  useEffect(() => {
    const syncPath = () => setIsAdmin(window.location.pathname === '/admin')
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])
  const openAdmin = (admin: boolean) => { window.history.pushState(null, '', admin ? '/admin' : '/'); setIsAdmin(admin) }
  if (isAdmin) return <AdminApp onExit={() => { setScreen('login'); openAdmin(false) }} />
  if (screen === 'login') return <A1Login onApplicantDemo={() => setScreen('applicant')} onAdminDemo={() => openAdmin(true)} onPersonalCheck={() => setScreen('personal')} />
  if (screen === 'personal') return <PersonalCheckApp onExit={() => setScreen('login')} />
  return <>
    {!verified && <B1EntryScreen onVerified={() => { setHasVerifiedOnce(true); setVerified(true); setPage('check') }} />}
    {hasVerifiedOnce && <div hidden={!verified || (page !== 'check' && page !== 'inbox')}><DocumentCheckFlow page={page} onNavigate={navigate} onLogout={logout} onOverviewChange={setOverview} /></div>}
    {verified && page === 'home' && <ModitHome overview={overview} onNavigate={navigate} onLogout={logout} />}
    {verified && page === 'guide' && <UsageGuide onNavigate={navigate} onLogout={logout} />}
  </>
}

export default App
