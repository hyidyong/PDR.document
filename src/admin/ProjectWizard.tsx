import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, CheckIcon, ChevronRightIcon } from '../components/common'
import { ArrowRightIcon, ChevronLeftIcon, FolderIcon, InfoIcon } from './adminIcons'
import { D2Roster } from './D2Roster'
import { D3Documents } from './D3Documents'
import { D4LinkShare } from './D4LinkShare'
import { LINK_HOST, slugError, suggestSlug, validRoster } from './projectDraft'
import type { ProjectDraft, WizardStep } from './projectDraft'
import './wizard.css'

const steps: { step: WizardStep; label: string; title: string; description: string }[] = [
  { step: 1, label: '기본 정보', title: '기본 정보를 정해요', description: '프로젝트 이름과 마감일을 정해요. 신청자에게 그대로 보여요.' },
  { step: 2, label: '신청자 명단', title: '신청자 명단을 정해요', description: '가지고 있는 명단을 쓰거나, 링크로 신청받아 명단을 자동으로 만들 수 있어요.' },
  { step: 3, label: '제출 서류', title: '제출 서류와 검사 기준을 정해요', description: '공고문을 붙여넣고 받을 서류를 정해요. 신청자 서류는 이 내용을 기준으로 검사해요.' },
  { step: 4, label: '링크 공유', title: '', description: '' },
]

function Stepper({ current, onJump }: { current: WizardStep; onJump?: (step: WizardStep) => void }) {
  return <ol aria-label="진행 단계" className="wz-stepper">
    {steps.map(({ step, label }) => {
      const done = step < current
      const canJump = done && onJump
      const content = <><span className="wz-step__circle">{done ? <CheckIcon width={14} height={14} /> : step}</span><span className="wz-step__label">{label}</span></>
      return <li aria-current={step === current ? 'step' : undefined} className={`wz-step ${done ? 'is-done' : ''} ${step === current ? 'is-current' : ''}`} key={step}>
        {step > 1 && <span className={`wz-step__connector ${step <= current ? 'is-done' : ''}`} />}
        {canJump ? <button onClick={() => onJump(step)} type="button">{content}</button> : <span className="wz-step__body">{content}</span>}
      </li>
    })}
  </ol>
}

type FieldErrors = Partial<Record<'name' | 'org' | 'deadline' | 'slug', string>>

function validateBasic(draft: ProjectDraft): FieldErrors {
  const errors: FieldErrors = {}
  if (!draft.name.trim()) errors.name = '프로젝트 이름을 입력해 주세요'
  if (!draft.org.trim()) errors.org = '기관명을 입력해 주세요'
  if (!draft.deadlineDate) errors.deadline = '마감일을 골라 주세요'
  const slug = slugError(draft.slug)
  if (slug) errors.slug = slug
  return errors
}

// Step 1 기본 정보. There is no design frame for it, so it follows the D2·D3 card and input styles.
function BasicInfo({ draft, errors, onChange }: { draft: ProjectDraft; errors: FieldErrors; onChange: (draft: ProjectDraft) => void }) {
  const field = (label: string, error: string | undefined, input: ReactNode, hint?: string) => <label className="wz-field">
    <span className="wz-label">{label}</span>{input}
    {error ? <span className="wz-field-error" role="alert">{error}</span> : hint && <span className="wz-hint">{hint}</span>}
  </label>
  return <section className="wz-card wz-basic">
    {field('프로젝트 이름', errors.name, <input aria-invalid={Boolean(errors.name)} className="wz-input" onChange={(event) => { const name = event.target.value; onChange({ ...draft, name, slug: draft.slugEdited ? draft.slug : suggestSlug(name) }) }} placeholder="예: 2026 창업동아리 지원사업 정산" value={draft.name} />)}
    {field('기관명', errors.org, <input aria-invalid={Boolean(errors.org)} className="wz-input" onChange={(event) => onChange({ ...draft, org: event.target.value })} placeholder="예: 한국대학교 창업지원단" value={draft.org} />)}
    <div className="wz-row">
      {field('마감일', errors.deadline, <input aria-invalid={Boolean(errors.deadline)} className="wz-input" onChange={(event) => onChange({ ...draft, deadlineDate: event.target.value })} type="date" value={draft.deadlineDate} />)}
      {field('마감 시각', undefined, <input className="wz-input" onChange={(event) => onChange({ ...draft, deadlineTime: event.target.value })} type="time" value={draft.deadlineTime} />)}
    </div>
    {field('링크 주소', errors.slug, <span className={`wz-input wz-input--prefix ${errors.slug ? 'is-error' : ''}`}><span>{LINK_HOST}</span><input aria-invalid={Boolean(errors.slug)} aria-label="링크 주소 (영문)" onChange={(event) => onChange({ ...draft, slug: event.target.value.toLowerCase().replace(/\s+/g, '-'), slugEdited: true })} placeholder="startup-2026" value={draft.slug} /></span>, '영문 소문자, 숫자, 하이픈(-)으로 만들어요. 4단계에서 이 링크를 공유해요.')}
  </section>
}

function Footer({ hint, onPrev, prevLabel = '이전', next }: { hint: ReactNode; onPrev: () => void; prevLabel?: string; next: ReactNode }) {
  return <footer className="wz-footer">
    <Button onClick={onPrev} size="large" variant="secondary"><ChevronLeftIcon width={16} height={16} />{prevLabel}</Button>
    <span className="wz-footer__spacer" />
    <span className="wz-footer__hint"><InfoIcon width={14} height={14} />{hint}</span>
    {next}
  </footer>
}

// 새 프로젝트 만들기: 1 기본 정보 → 2 신청자 명단 (D2) → 3 제출 서류 (D3) → 4 링크 공유 (D4).
// AdminApp owns the step (browser history) and the draft; onCreate saves the project in the mock (adminApi) before step 4.
// onNext records the next step; onBack(step) returns to an earlier one (0 = leave the wizard).
export function ProjectWizard({ step, draft, onDraftChange, onNext, onBack, onCreate, onDone }: {
  step: WizardStep
  draft: ProjectDraft
  onDraftChange: (draft: ProjectDraft) => void
  onNext: (step: WizardStep) => void
  onBack: (step: WizardStep | 0) => void
  onCreate: () => Promise<void>
  onDone: () => void
}) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const info = steps[step - 1]
  const valid = validRoster(draft).length
  const problems = draft.roster.length - valid
  const namedDocuments = draft.documents.filter((doc) => doc.name.trim()).length
  // After the project is made, earlier steps are view-only so 뒤로가기 cannot make a second copy.
  const locked = Boolean(draft.created)

  const nextFromBasic = () => {
    const found = validateBasic(draft)
    setErrors(found)
    if (!Object.keys(found).length) onNext(2)
  }
  const create = async () => {
    if (locked) { onNext(4); return }
    setCreateError('')
    setCreating(true)
    try { await onCreate() }
    catch (error) { setCreateError(error instanceof Error ? error.message : '프로젝트를 만들지 못했어요.') }
    finally { setCreating(false) }
  }

  const nextButton = (label: string, onClick: () => void, disabled = false) => <Button disabled={disabled} onClick={onClick} size="large">{label}<ArrowRightIcon width={16} height={16} /></Button>

  return <main className="wz-page">
    {step < 4 && <div className="wz-page-header">
      <div className="wz-page-header__text">
        <div className="admin-breadcrumb"><span>프로젝트</span><ChevronRightIcon width={14} height={14} /><span>새 프로젝트 만들기</span></div>
        <h1>{info.title}</h1>
        <p>{info.description}</p>
      </div>
      <span className="wz-project-name"><FolderIcon width={16} height={16} />{draft.name.trim() || '새 프로젝트'}</span>
    </div>}
    <div className={`wz-stepper-wrap ${step === 4 ? 'is-last' : ''}`}><Stepper current={step} onJump={locked ? undefined : onBack} /></div>

    <div className="wz-body">
      {locked && step < 4 && <p className="wz-locked" role="status"><InfoIcon width={14} height={14} />이미 만든 프로젝트예요. 여기서 바꾼 내용은 반영되지 않아요.</p>}
      {step === 1 && <BasicInfo draft={draft} errors={errors} onChange={onDraftChange} />}
      {step === 2 && <D2Roster draft={draft} onChange={onDraftChange} />}
      {step === 3 && <D3Documents draft={draft} onChange={onDraftChange} />}
      {step === 4 && draft.created && <D4LinkShare onDone={onDone} project={draft.created} />}
      {step === 4 && !draft.created && <section className="wz-card" role="alert"><h1>링크 정보를 복원하지 못했어요</h1><p>저장된 프로젝트가 없거나 브라우저 저장소가 초기화되었습니다.</p><Button onClick={onDone}>프로젝트 목록으로 돌아가기</Button></section>}
    </div>

    {step === 1 && <Footer hint="모든 칸은 나중에 바꿀 수 있어요" next={nextButton('다음: 신청자 명단', nextFromBasic)} onPrev={() => onBack(0)} prevLabel="취소" />}
    {step === 2 && <Footer
      hint={draft.rosterMode === 'link' ? '링크로 신청한 사람이 명단에 자동으로 추가돼요' : problems ? `확인이 필요한 ${problems}행은 빼고 등록돼요. 고쳐서 다시 올릴 수도 있어요` : valid ? `${valid}명이 등록돼요` : '명단을 올리거나 이전 프로젝트 명단을 불러와 주세요'}
      next={nextButton(draft.rosterMode === 'list' && problems ? '오류 행 제외하고 다음' : '다음: 제출 서류', () => onNext(3), draft.rosterMode === 'list' && valid === 0)}
      onPrev={() => onBack(1)}
    />}
    {step === 3 && <Footer
      hint={createError ? <span className="wz-field-error">{createError}</span> : `서류 ${namedDocuments}개 · 입력한 내용은 단계를 옮겨도 그대로예요`}
      next={nextButton(creating ? '만드는 중...' : '다음: 링크 공유', () => void create(), creating || namedDocuments === 0)}
      onPrev={() => onBack(2)}
    />}
  </main>
}
