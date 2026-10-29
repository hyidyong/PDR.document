import { useState } from 'react'
import type { FormEvent } from 'react'
import { BrandLogo, Button, CheckIcon, FileIcon } from '../components/common'
import './A1Login.css'

const demoNotice = '데모 버전에서는 체험하기를 이용해 주세요'

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

export function A1Login({ onApplicantDemo, onAdminDemo, onPersonalCheck }: { onApplicantDemo: () => void; onAdminDemo: () => void; onPersonalCheck: () => void }) {
  const [notice, setNotice] = useState('')
  const showNotice = () => setNotice(demoNotice)
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); showNotice() }

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
            <label className="a1-field"><span>이메일</span><span className="a1-input"><input autoComplete="email" placeholder="이메일 주소를 입력해 주세요" type="email" /><MailIcon /></span></label>
            <label className="a1-field"><span>비밀번호</span><span className="a1-input"><input autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" type="password" /><LockIcon /></span></label>
          </div>
          <div className="a1-options">
            <label className="a1-keep"><input type="checkbox" /><span>로그인 상태 유지</span></label>
            <button className="a1-text-button" onClick={showNotice} type="button">비밀번호 찾기</button>
          </div>
          {notice && <p className="a1-notice" role="alert">{notice}</p>}
          <Button size="large" type="submit">로그인</Button>
          <div className="a1-signup"><span>아직 계정이 없나요?</span><button className="a1-text-button a1-text-button--brand" onClick={showNotice} type="button">회원가입</button></div>

          <div className="a1-demo">
            <div className="a1-demo__divider"><span>데모 체험</span></div>
            <button className="a1-demo-button a1-demo-button--applicant" onClick={onApplicantDemo} type="button">
              <span className="a1-demo-button__icon"><UserIcon /></span>
              <span className="a1-demo-button__text"><strong>신청자로 체험하기</strong><small>김청년 · 창업동아리 지원사업 정산 서류 제출</small></span>
              <ArrowRightIcon />
            </button>
            <button className="a1-demo-button a1-demo-button--admin" onClick={onAdminDemo} type="button">
              <span className="a1-demo-button__icon"><BriefcaseIcon /></span>
              <span className="a1-demo-button__text"><strong>담당자로 체험하기</strong><small>한국대학교 창업지원단 · 제출 현황 확인</small></span>
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
