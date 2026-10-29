import { useState } from 'react'
import type { ReactNode } from 'react'
import type { UserRole } from '../api/authApi'
import { BrandLogo, Button, CheckIcon } from '../components/common'
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
  { role: 'admin', chip: '기관·동아리 담당자', title: '서류를 받아요', description: '폼을 만들고 제출 현황을 관리해요', icon: <InboxIcon /> },
  { role: 'applicant', chip: '개인 사용자', title: '서류를 내요', description: '제출 전에 내 서류를 점검해요', icon: <SendIcon /> },
]

// A2 역할 선택, shown in two places:
// - signup: 회원가입 1단계. Sign-up is not built yet, so 다음 only shows a notice.
// - afterLogin: right after A1 login. 다음 calls onChoose (담당자 → D5, 개인 사용자 → 신청자 화면);
//   if it throws (e.g. 신청 정보 없음), the message is shown and the user stays here.
//   onLogin is then 다른 계정으로 로그인 (App logs out and returns to A1).
export function A2RoleSelect({ mode = 'signup', onLogin, onChoose }: { mode?: 'signup' | 'afterLogin'; onLogin: () => void; onChoose?: (role: UserRole) => Promise<void> }) {
  const [role, setRole] = useState<UserRole | null>(null)
  const [notice, setNotice] = useState('')
  const [isChoosing, setIsChoosing] = useState(false)
  const isSignup = mode === 'signup'

  const next = async () => {
    if (!role) return
    if (isSignup || !onChoose) { setNotice('회원가입은 준비 중이에요. 데모 계정으로 로그인해 주세요'); return }
    setNotice('')
    setIsChoosing(true)
    try { await onChoose(role) }
    catch (error) { setNotice(error instanceof Error ? error.message : '화면을 열지 못했습니다.'); setIsChoosing(false) }
  }

  return <main className="a1-screen">
    <header className="a1-header a2-header">
      <BrandLogo />
      {isSignup && <div aria-label="회원가입 1 / 2단계" className="a2-steps"><span className="is-done" /><span /><small>1 / 2</small></div>}
    </header>
    <div className="a2-body">
      <div className="a2-column">
        <div className="a2-heading">
          {isSignup && <span>회원가입 · 1단계</span>}
          <h1>모딧을 어떻게 사용하시나요?</h1>
          <p>역할에 맞는 화면으로 시작해요. 나중에 설정에서 바꿀 수 있어요.</p>
        </div>

        <div aria-label="역할" className="a2-roles" role="radiogroup">
          {roles.map((item) => <label className={`a2-role ${role === item.role ? 'is-selected' : ''}`} key={item.role}>
            <input checked={role === item.role} name="a2-role" onChange={() => { setRole(item.role); setNotice('') }} type="radio" />
            <span className="a2-role__top">
              <span className="a2-role__icon">{item.icon}</span>
              <span aria-hidden="true" className="a2-role__radio">{role === item.role && <CheckIcon width={16} height={16} />}</span>
            </span>
            <span className="a2-role__text">
              <span className="a2-role__chip">{item.chip}</span>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </span>
          </label>)}
        </div>

        {notice && <p className="a1-notice" role="alert">{notice}</p>}

        <div className="a2-footer">
          {isSignup
            ? <div className="a1-signup"><span>이미 계정이 있나요?</span><button className="a1-text-button a1-text-button--brand" onClick={onLogin} type="button">로그인</button></div>
            : <div className="a1-signup"><button className="a1-text-button a1-text-button--brand" onClick={onLogin} type="button">다른 계정으로 로그인</button></div>}
          <Button disabled={!role || isChoosing} onClick={() => void next()} size="large">{isChoosing ? '확인 중...' : <>다음<ArrowRightIcon /></>}</Button>
        </div>
      </div>
    </div>
  </main>
}
