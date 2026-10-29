import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { UserRole } from '../api/authApi'
import { BrandLogo, Button, CheckIcon } from '../components/common'
import { showNotice } from '../store/noticeStore'
import { ReadyNotice } from './ReadyNotice'
import './A1Login.css'
import './A2RoleSelect.css'

function InboxIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M3.5 13.5 6 5.5h12l2.5 8v5h-17v-5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M3.5 13.5h5l1 2h5l1-2h5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function SendIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M20.5 3.5 10 14M20.5 3.5l-6.5 17-4-6.5-6.5-4 17-6.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function ArrowRightIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" width="16" height="16"><path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
}

const roles: { role: UserRole; chip: string; title: string; description: string; icon: ReactNode }[] = [
  { role: 'admin', chip: '기관·동아리', title: '담당자', description: '서류를 요청하고 검토해요. 프로젝트를 만들어 링크로 받아요.', icon: <InboxIcon /> },
  { role: 'applicant', chip: '개인', title: '사용자', description: '서류를 점검하고 제출해요. AI가 먼저 확인해 줘요.', icon: <SendIcon /> },
]

function RoleCardBody({ item, children }: { item: typeof roles[number]; children?: ReactNode }) {
  return <>
    <span className="a2-role__icon">{item.icon}</span>
    <span className="a2-role__chip">{item.chip}</span>
    <strong className="a2-role__title">{item.title}</strong>
    <span className="a2-role__description">{item.description}</span>
    {children}
  </>
}

// A2 역할 선택, shown in two places:
// - signup: 회원가입 1단계. A card is selected, then 다음 only shows a notice (sign-up is not built yet).
// - afterLogin: right after A1 login. Choosing a card goes in at once through onChoose (담당자 → D1, 사용자 → 신청자 홈);
//   if it throws (e.g. 신청 정보 없음), the message is shown and the user stays here.
//   onLogin is then 다른 계정으로 로그인 (App logs out and returns to A1).
export function A2RoleSelect({ mode = 'signup', onLogin, onChoose }: { mode?: 'signup' | 'afterLogin'; onLogin: () => void; onChoose?: (role: UserRole) => Promise<void> }) {
  const [role, setRole] = useState<UserRole | null>(null)
  const [notice, setNotice] = useState('')
  const [choosing, setChoosing] = useState<UserRole | null>(null)
  // Blocks a second click before the disabled state renders.
  const busy = useRef(false)
  const isSignup = mode === 'signup'

  const choose = async (next: UserRole) => {
    if (busy.current || !onChoose) return
    busy.current = true
    setNotice('')
    setChoosing(next)
    try { await onChoose(next) }
    catch (error) { setNotice(error instanceof Error ? error.message : '화면을 열지 못했습니다.'); busy.current = false; setChoosing(null) }
  }

  return <main className="a1-screen a2-screen">
    <ReadyNotice />
    <div className="a2-body">
      <div className="a2-column">
        <div className="a2-heading">
          <div className="a2-brand-row">
            <BrandLogo />
            {isSignup && <div aria-label="회원가입 1 / 2단계" className="a2-steps"><span className="is-done" /><span /><small>1 / 2</small></div>}
          </div>
          {isSignup && <span className="a2-eyebrow">회원가입 · 1단계</span>}
          <h1>모딧을 어떻게 사용하시나요?</h1>
          <p>로그인할 때마다 역할을 고를 수 있어요.</p>
        </div>

        {isSignup
          ? <div aria-label="역할" className="a2-roles" role="radiogroup">
            {roles.map((item) => <label className={`a2-role ${role === item.role ? 'is-selected' : ''}`} key={item.role}>
              <input checked={role === item.role} name="a2-role" onChange={() => setRole(item.role)} type="radio" />
              <RoleCardBody item={item}><span aria-hidden="true" className="a2-role__radio">{role === item.role && <CheckIcon width={16} height={16} />}</span></RoleCardBody>
            </label>)}
          </div>
          : <div aria-label="역할" className="a2-roles" role="group">
            {roles.map((item) => <button aria-busy={choosing === item.role} className={`a2-role ${choosing === item.role ? 'is-selected' : ''}`} disabled={choosing !== null} key={item.role} onClick={() => void choose(item.role)} type="button">
              <RoleCardBody item={item}>{choosing === item.role && <span className="a2-role__status">확인 중...</span>}</RoleCardBody>
            </button>)}
          </div>}

        {notice && <p className="a1-notice" role="alert">{notice}</p>}

        <div className="a2-footer">
          {isSignup
            ? <>
              <div className="a1-signup"><span>이미 계정이 있나요?</span><button className="a1-text-button a1-text-button--brand" onClick={onLogin} type="button">로그인</button></div>
              <Button disabled={!role} onClick={() => showNotice('회원가입은 준비 중이에요. 데모 계정으로 로그인해 주세요')} size="large">다음<ArrowRightIcon /></Button>
            </>
            : <div className="a1-signup"><button className="a1-text-button a1-text-button--brand" disabled={choosing !== null} onClick={onLogin} type="button">다른 계정으로 로그인</button></div>}
        </div>
      </div>
    </div>
  </main>
}
