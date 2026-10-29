import { useState } from 'react'
import { AppHeader } from '../components/common'
import type { MainPage } from '../components/common'
import { C2CriteriaInput } from './C2CriteriaInput'
import { C3Checklist } from './C3Checklist'
import { C4Complete } from './C4Complete'
import { PersonalCheck } from './PersonalCheck'
import { mockCriteria } from './personalMock'
import type { Criteria, PersonalUpload } from './personalMock'
import './personal.css'

type Step = 'input' | 'checklist' | 'check' | 'done'

export function PersonalCheckApp({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState<Step>('input')
  const [criteria, setCriteria] = useState<Criteria>(mockCriteria)
  const [uploads, setUploads] = useState<Array<PersonalUpload | undefined>>([])
  const [checkedAt, setCheckedAt] = useState(() => new Date())

  const restart = () => { setCriteria(mockCriteria); setUploads([]); setStep('input') }
  const navigate = (page: MainPage) => { if (page === 'home') onExit(); else if (page === 'check') restart() }

  return <div className="personal-flow">
    <AppHeader activePage="check" onNavigate={navigate} onLogout={onExit} />
    {step === 'input' && <C2CriteriaInput onNext={() => { setCheckedAt(new Date()); setStep('checklist') }} />}
    {step === 'checklist' && <C3Checklist criteria={criteria} sourceDate={checkedAt} onChange={setCriteria} onStart={() => { setUploads([]); setStep('check') }} />}
    {step === 'check' && <PersonalCheck criteria={criteria} uploads={uploads} onUploadsChange={setUploads} onBack={() => setStep('checklist')} onComplete={() => setStep('done')} />}
    {step === 'done' && <C4Complete criteria={criteria} uploads={uploads.filter((upload): upload is PersonalUpload => Boolean(upload))} checkedAt={checkedAt} onCheckAnother={restart} onHome={onExit} />}
  </div>
}
