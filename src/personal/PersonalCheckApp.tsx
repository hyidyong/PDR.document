import { useState } from 'react'
import { AppHeader } from '../components/common'
import type { MainPage } from '../components/common'
import { C2CriteriaInput } from './C2CriteriaInput'
import { C3Checklist } from './C3Checklist'
import { C4Complete } from './C4Complete'
import { PersonalCheck } from './PersonalCheck'
import { mockCriteria } from './personalMock'
import type { Criteria, PersonalUpload } from './personalMock'
import type { ChecklistResponse } from '../api'
import './personal.css'

type Step = 'input' | 'checklist' | 'check' | 'done'

export function PersonalCheckApp({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState<Step>('input')
  const [criteria, setCriteria] = useState<Criteria>(mockCriteria)
  const [uploads, setUploads] = useState<Array<PersonalUpload | undefined>>([])
  const [checkedAt, setCheckedAt] = useState(() => new Date())
  const [sourceText, setSourceText] = useState('')

  const applyChecklist = (response: ChecklistResponse, source: string) => {
    const submitRules = [response.deadline && `마감: ${response.deadline}`, response.filenameRule && `파일명: ${response.filenameRule}`]
      .filter((value): value is string => Boolean(value)).map((text) => ({ text }))
    setCriteria({
      title: response.programName || 'AI 생성 체크리스트', term: response.documentType || '지원사업 제출서류',
      docs: response.items.map((item) => ({
        name: item.title, note: item.requirement, requirement: item.requirement, issuer: item.issuer,
        howToObtain: item.howToObtain, estimatedTime: item.estimatedTime, deadline: item.deadline,
        filenameRule: item.filenameRule, sourceUrl: item.sourceUrl, sourceType: item.sourceType,
        verification: item.verification, evidence: item.evidence,
      })),
      rules: { writing: response.questions.map((text) => ({ text })), file: response.filenameRule ? [{ text: response.filenameRule }] : [], submit: submitRules },
      webSearchUsed: response.webSearchUsed, sourceVerification: response.sourceVerification,
      disclaimer: response.disclaimer, questions: response.questions, fromApi: true,
    })
    setSourceText(source); setCheckedAt(new Date()); setStep('checklist')
  }

  const restart = () => { setCriteria(mockCriteria); setUploads([]); setStep('input') }
  const navigate = (page: MainPage) => { if (page === 'home') onExit(); else if (page === 'check') restart() }

  return <div className="personal-flow">
    <AppHeader actionLabel="나가기" activePage="check" onNavigate={navigate} onLogout={onExit} profileName="개인 점검" />
    {step === 'input' && <C2CriteriaInput onNext={applyChecklist} />}
    {step === 'checklist' && <C3Checklist criteria={criteria} sourceDate={checkedAt} sourceText={sourceText} onChange={setCriteria} onStart={() => { setUploads([]); setStep('check') }} />}
    {step === 'check' && <PersonalCheck criteria={criteria} uploads={uploads} onUploadsChange={setUploads} onBack={() => setStep('checklist')} onComplete={() => setStep('done')} />}
    {step === 'done' && <C4Complete criteria={criteria} uploads={uploads.filter((upload): upload is PersonalUpload => Boolean(upload))} checkedAt={checkedAt} onCheckAnother={restart} onHome={onExit} />}
  </div>
}
