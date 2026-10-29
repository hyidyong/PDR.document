import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AuthError, login } from '../api/authApi'
import type { UserRole } from '../api/authApi'
import { BrandLogo, Button, CheckIcon, FileIcon } from '../components/common'
import { clearSession, getSession, saveSession, takeRestoredSession } from '../store/sessionStore'
import { A2RoleSelect } from './A2RoleSelect'
import './A1Login.css'

type FieldErrors = { email?: string; password?: string }

function MailIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><rect height="14" rx="2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="5" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function LockIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><rect height="10" rx="2" stroke="currentColor" strokeWidth="1.7" width="14" x="5" y="10" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>
}

function LinkIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function UserIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>
}

function BriefcaseIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><rect height="12" rx="2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="7" /><path d="M9 7V5h6v2M3 12h18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function ArrowRightIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
}

// onApplicantDemo / onAdminDemo open the 신청자 / 담당자 screens; a successful login reuses them.
export function A1Login({ onApplicantDemo, onAdminDemo, onPersonalCheck }: { onApplicantDemo: () => void; onAdminDemo: () => void; onPersonalCheck: () => void }) {
  const [view, setView] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const enter = (role: UserRole) => { if (role === 'REVIEWER') onAdminDemo(); else onApplicantDemo() }

  // On the first visit after a reload, a kept session skips the login screen.
  // Any later return to A1 (e.g. 신청자 화면의 로그아웃) ends the session instead.
  const handledSession = useRef(false)
  useEffect(() => {
    if (handledSession.current) return
    handledSession.current = true
    const restored = takeRestoredSession()
    if (restored) { if (restored.user.role === 'REVIEWER') onAdminDemo(); else onApplicantDemo(); return }
    if (getSession()) clearSession()
  }, [onAdminDemo, onApplicantDemo])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    setNotice('')
    setSubmitting(true)
    try {
      const session = await login(email, password)
      saveSession(session, keepSignedIn)
      enter(session.user.role)
    } catch (error) {
      if (error instanceof AuthError) setErrors({ [error.field]: error.message })
      else { console.error(error); setNotice('로그인하지 못했어요. 잠시 후 다시 시도해 주세요') }
      setSubmitting(false)
    }
  }

  if (view === 'signup') return <A2RoleSelect onLogin={() => setView('login')} />

  return <main className="a1-screen">
    <header className="a1-header"><BrandLogo /></header>
    <div className="a1-body">
      <section className="a1-brand">
        <div className="a1-copy">
          <h1><span>제출 전에 한 번 더,</span><span>꼼꼼하게 <em>모딧.</em></span></h1>
          <p>공고나 양식을 넣으면 AI가 내 서류를 먼저 확인해드려요.</p>
        </div>
        <div className="a1-art" aria-hidden="true">
          <div className="a1-art__sheet"><FileIcon width={96} height={96} /></div>
          <span className="a1-art__chip a1-art__chip--pass"><CheckIcon width={14} height={14} />서명·날인 확인</span>
          <span className="a1-art__chip a1-art__chip--error">금액 불일치 1</span>
        </div>
      </section>

      <div className="a1-column">
        <form className="a1-card" noValidate onSubmit={handleSubmit}>
          <div className="a1-card__head"><h2>로그인</h2><p>모딧 계정으로 로그인해 주세요.</p></div>
          <div className="a1-fields">
            <label className="a1-field"><span>이메일</span><span className={`a1-input ${errors.email ? 'is-error' : ''}`}><input aria-describedby={errors.email ? 'a1-email-error' : undefined} aria-invalid={Boolean(errors.email)} autoComplete="email" onChange={(event) => { setEmail(event.target.value); setErrors({ ...errors, email: undefined }) }} placeholder="이메일 주소를 입력해 주세요" type="email" value={email} /><MailIcon /></span>
              {errors.email && <span className="a1-field-error" id="a1-email-error" role="alert">{errors.email}</span>}</label>
            <label className="a1-field"><span>비밀번호</span><span className={`a1-input ${errors.password ? 'is-error' : ''}`}><input aria-describedby={errors.password ? 'a1-password-error' : undefined} aria-invalid={Boolean(errors.password)} autoComplete="current-password" onChange={(event) => { setPassword(event.target.value); setErrors({ ...errors, password: undefined }) }} placeholder="비밀번호를 입력해 주세요" type="password" value={password} /><LockIcon /></span>
              {errors.password && <span className="a1-field-error" id="a1-password-error" role="alert">{errors.password}</span>}</label>
          </div>
          <div className="a1-options">
            <label className="a1-keep"><input checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} type="checkbox" /><span>로그인 상태 유지</span></label>
            <button className="a1-text-button" onClick={() => setNotice('비밀번호 찾기는 준비 중이에요')} type="button">비밀번호 찾기</button>
          </div>
          {notice && <p className="a1-notice" role="alert">{notice}</p>}
          <Button disabled={submitting} size="large" type="submit">로그인</Button>
          <div className="a1-signup"><span>아직 계정이 없나요?</span><button className="a1-text-button a1-text-button--brand" onClick={() => setView('signup')} type="button">회원가입</button></div>

          <div className="a1-demo">
            <div className="a1-demo__divider"><span>데모 체험</span></div>
            <button className="a1-demo-button a1-demo-button--applicant" onClick={onApplicantDemo} type="button">
              <span className="a1-demo-button__icon"><UserIcon /></span>
              <span className="a1-demo-button__text"><strong>신청자 데모</strong><small>김청년 · 창업동아리 지원사업 정산 서류 제출</small></span>
              <ArrowRightIcon />
            </button>
            <button className="a1-demo-button a1-demo-button--admin" onClick={onAdminDemo} type="button">
              <span className="a1-demo-button__icon"><BriefcaseIcon /></span>
              <span className="a1-demo-button__text"><strong>담당자 데모</strong><small>한국대학교 창업지원단 · 제출 현황 확인</small></span>
              <ArrowRightIcon />
            </button>
            <button className="a1-solo-link" onClick={onPersonalCheck} type="button">기관 링크 없이 혼자 점검하기 <ArrowRightIcon /></button>
          </div>
        </form>
        <p className="a1-link-notice"><LinkIcon />기관에서 받은 제출 링크가 있다면 로그인 없이 바로 들어갈 수 있어요.</p>
      </div>
    </div>
  </main>
}
