import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AuthError, login, logout } from '../api/authApi'
import { BrandLogo, Button, CheckIcon, FileIcon } from '../components/common'
import { showNotice } from '../store/noticeStore'
import { setSessionUser } from '../store/sessionStore'
import { A2RoleSelect } from './A2RoleSelect'
import { ReadyNotice } from './ReadyNotice'
import './A1Login.css'
import './stickyHeader.css'

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

function BriefcaseIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><rect height="12" rx="2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="7" /><path d="M9 7V5h6v2M3 12h18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function SparkleIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4ZM18 15l.7 1.8 1.8.7-1.8.7L18 20l-.7-1.8-1.8-.7 1.8-.7L18 15Z" fill="currentColor" /></svg>
}

function WarningIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M12 4 3 19.5h18L12 4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" /><path d="M12 10v4.5M12 17v.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
}

function PenOffIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="m14.5 6.5 3 3M6 18l1.2-4.2 7.6-7.6a2.1 2.1 0 0 1 3 3l-7.6 7.6L6 18ZM4 4l16 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
}

// 매도인 서명 (the art only).
function SignatureMark() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 40 24"><path d="M4 18c3-1 5-5 6-9 1-3 4-4 4 0 0 5-3 9-5 9s-1-4 2-6 5-2 6 1-1 5 1 5 3-3 5-4 4 2 7 1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /><path d="M6 21h28" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" /></svg>
}

function ArrowRightIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
}

// [사용자 데모] signs in with this 신청자 account from .env; the button is hidden when either value is empty.
const demoApplicant = { email: import.meta.env.VITE_DEMO_APPLICANT_EMAIL ?? '', password: import.meta.env.VITE_DEMO_APPLICANT_PASSWORD ?? '' }
const hasDemoApplicant = Boolean(demoApplicant.email && demoApplicant.password)

// onAuthenticated leads to the A2 역할 선택 (App); onAdminDemo opens the 담당자 screens on mock data without logging in.
// onApplicantDemo skips A2 and opens the 신청자 서류 점검 (App runs chooseApplicant); it throws if that fails.
export function A1Login({ onAuthenticated, onApplicantDemo, onAdminDemo, onPersonalCheck }: {
  onAuthenticated: (deadlineAt?: string | null) => void
  onApplicantDemo: (deadlineAt?: string | null) => Promise<void>
  onAdminDemo: () => void
  onPersonalCheck: () => void
}) {
  const [view, setView] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Blocks a second click/Enter before the disabled state renders.
  const busy = useRef(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy.current) return
    busy.current = true
    setErrors({})
    setNotice('')
    setIsSubmitting(true)
    try {
      const result = await login(email, password)
      setSessionUser(result.user)
      onAuthenticated(result.project.deadlineAt)
    } catch (error) {
      if (error instanceof AuthError) setErrors({ [error.field]: error.message })
      else setNotice(error instanceof Error ? error.message : '로그인하지 못했습니다.')
    } finally { busy.current = false; setIsSubmitting(false) }
  }

  const startApplicantDemo = async () => {
    if (busy.current) return
    busy.current = true
    setErrors({})
    setNotice('')
    setIsSubmitting(true)
    try {
      const result = await login(demoApplicant.email, demoApplicant.password)
      setSessionUser(result.user)
      await onApplicantDemo(result.project.deadlineAt)
    } catch (error) {
      void logout()
      setNotice(error instanceof Error ? error.message : '사용자 데모를 열지 못했습니다.')
      busy.current = false
      setIsSubmitting(false)
    }
  }

  if (view === 'signup') return <A2RoleSelect onLogin={() => setView('login')} />

  return <main className="a1-screen">
    <header className="a1-header"><BrandLogo /></header>
    <ReadyNotice />
    <div className="a1-body">
      <section className="a1-brand">
        <div className="a1-copy">
          <span className="a1-eyebrow">AI 기반 서류 사전검수 및 요청·제출 연계 클라우드 플랫폼</span>
          <h1><span>제출 전에 한 번 더,</span><span>꼼꼼하게 <em>모딧.</em></span></h1>
          <p>공고나 양식을 넣으면 AI가 내 서류를 먼저 확인해드려요.</p>
        </div>
        {/* A 물품매매계약서 being checked: 계약 금액 and the missing 매수인 서명 are what the AI finds. */}
        <div className="a1-art" aria-hidden="true">
          <div className="a1-art__stack" />
          <div className="a1-doc">
            <div className="a1-doc__head"><span className="a1-doc__icon"><FileIcon width={20} height={20} /></span><span className="a1-doc__name"><strong>물품매매계약서</strong><small>PDF · 2페이지</small></span></div>
            <div className="a1-doc__lines"><i /><i /><i /><i className="is-short" /></div>
            <span className="a1-doc__scan" />
            <div className="a1-doc__amount"><span>계약 금액</span><strong>1,350,000원</strong></div>
            <div className="a1-doc__signs">
              <div className="a1-doc__sign"><span>매도인</span><SignatureMark /></div>
              <div className="a1-doc__sign is-missing"><span>매수인</span><em>(인)</em></div>
            </div>
          </div>
          <span className="a1-art__chip a1-art__chip--ai"><span className="a1-art__chip-icon"><SparkleIcon /></span>AI 점검 완료</span>
          <span className="a1-art__chip a1-art__chip--docs"><span className="a1-art__chip-icon"><CheckIcon width={14} height={14} /></span>필수 서류 3/3</span>
          <span className="a1-art__chip a1-art__chip--amount"><span className="a1-art__chip-icon"><WarningIcon /></span>금액 30,000원 차이</span>
          <span className="a1-art__chip a1-art__chip--sign"><span className="a1-art__chip-icon"><PenOffIcon /></span>매수인 서명 누락</span>
        </div>
        <p className="a1-tagline"><span><b>모</b>두의 서류를 완벽하게 E<b>dit</b>하다, <b>모딧</b></span><small>모두의 + Edit</small></p>
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
            <label className="a1-keep"><input type="checkbox" /><span>로그인 상태 유지</span></label>
            <button className="a1-text-button" onClick={() => showNotice('비밀번호 찾기는 준비 중이에요')} type="button">비밀번호 찾기</button>
          </div>
          {notice && <p className="a1-notice" role="alert">{notice}</p>}
          <Button disabled={isSubmitting} size="large" type="submit">{isSubmitting ? '로그인 중...' : '로그인'}</Button>
          <div className="a1-signup"><span>아직 계정이 없나요?</span><button className="a1-text-button a1-text-button--brand" onClick={() => setView('signup')} type="button">회원가입</button></div>

          <div className="a1-demo">
            <div className="a1-demo__divider"><span>다른 이용 방법</span></div>
            <div className={hasDemoApplicant ? 'a1-demo__row' : undefined}>
              {hasDemoApplicant && <button className="a1-demo-button a1-demo-button--applicant" disabled={isSubmitting} onClick={() => void startApplicantDemo()} type="button">
                <span className="a1-demo-button__icon"><FileIcon /></span>
                <span className="a1-demo-button__text"><strong>사용자 데모</strong></span>
                <ArrowRightIcon />
              </button>}
              <button className="a1-demo-button a1-demo-button--admin" disabled={isSubmitting} onClick={onAdminDemo} type="button">
                <span className="a1-demo-button__icon"><BriefcaseIcon /></span>
                <span className="a1-demo-button__text"><strong>담당자 데모</strong></span>
                <ArrowRightIcon />
              </button>
            </div>
            <button className="a1-solo-link" onClick={onPersonalCheck} type="button">기관 링크 없이 혼자 점검하기 <ArrowRightIcon /></button>
          </div>
        </form>
        <p className="a1-link-notice"><LinkIcon />기관에서 받은 제출 링크가 있다면 로그인 없이 바로 들어갈 수 있어요.</p>
      </div>
    </div>
  </main>
}
