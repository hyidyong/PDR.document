import { useState } from 'react'
import { B1EntryScreen } from './screens/B1EntryScreen'
import { DocumentCheckFlow } from './screens/DocumentCheckFlow'
import type { MainPage } from './components/common'
import { emptyFlowOverview } from './screens/checkModel'
import { ModitHome } from './screens/ModitHome'
import { UsageGuide } from './screens/UsageGuide'

function App() {
  const [verified, setVerified] = useState(false)
  const [hasVerifiedOnce, setHasVerifiedOnce] = useState(false)
  const [page, setPage] = useState<MainPage>('home')
  const [overview, setOverview] = useState(emptyFlowOverview)
  const navigate = (nextPage: MainPage) => { if (verified) setPage(nextPage) }
  const logout = () => { setVerified(false); setPage('home') }
  return <>
    {!verified && <B1EntryScreen onVerified={() => { setHasVerifiedOnce(true); setVerified(true); setPage('check') }} />}
    {hasVerifiedOnce && <div hidden={!verified || (page !== 'check' && page !== 'inbox')}><DocumentCheckFlow page={page} onNavigate={navigate} onLogout={logout} onOverviewChange={setOverview} /></div>}
    {verified && page === 'home' && <ModitHome overview={overview} onNavigate={navigate} onLogout={logout} />}
    {verified && page === 'guide' && <UsageGuide onNavigate={navigate} onLogout={logout} />}
  </>
}

export default App
