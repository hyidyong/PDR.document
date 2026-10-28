import { useState } from 'react'
import type { FormEvent } from 'react'
import { BrandLogo, Button, FileIcon } from '../components/common'
import { mockProject } from './mockProject'
import './B1EntryScreen.css'

const mockParticipant = { name: '김청년', studentId: '20231234' }

const requiredDocuments = [
  { number: '01', name: '사업계획서', meta: '최종본 · 대표자 서명' },
  { number: '02', name: '물품매매계약서', meta: '구매 건별 1부' },
  { number: '03', name: '영수증 첨부철', meta: '사용일 순 · 1개 파일' },
]

const downloadFiles = [
  { name: '물품매매계약서 양식.pdf', size: '156KB' },
  { name: '영수증 첨부철 작성 예시.pdf', size: '524KB' },
]

function BuildingIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4 20h16M6 20V7l6-3 6 3v13M9 10h1M14 10h1M9 14h1M14 14h1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function CalendarIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><rect height="16" rx="2" stroke="currentColor" strokeWidth="1.7" width="16" x="4" y="5" /><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>
}

function InfoIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" /><path d="M12 10.5v5M12 7.8v.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
}

function DownloadIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function ArrowRightIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
}

export function B1EntryScreen({ onVerified }: { onVerified?: () => void }) {
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedStudentId = studentId.trim()

    if (!normalizedName || !normalizedStudentId) {
      setError('이름과 학번을 모두 입력해 주세요.')
      setIsVerified(false)
      return
    }

    if (normalizedName !== mockParticipant.name || normalizedStudentId !== mockParticipant.studentId) {
      setError('담당자가 등록한 명단과 일치하지 않아요. 이름과 학번을 다시 확인해 주세요.')
      setIsVerified(false)
      return
    }

    setError('')
    setIsVerified(true)
    onVerified?.()
  }

  return (
    <main className="b1-screen">
      <header className="b1-simple-header"><BrandLogo /></header>
      <div className="b1-body">
        <section className="b1-program">
          <div className="b1-heading">
            <div className="b1-org"><span className="b1-org__icon"><BuildingIcon /></span><span>{mockProject.organization}</span></div>
            <h1>{mockProject.name} 서류 제출</h1>
            <span className="b1-deadline"><CalendarIcon />{mockProject.deadlineBadge}</span>
          </div>

          <div className="b1-manager-note">
            <strong>담당자 안내 · 이창업 담당</strong>
            <p>정산 서류 3개를 10월 31일까지 올려 주세요. 영수증은 사용일 순서대로 한 파일로 묶어 주세요. 올리면 AI가 빠진 항목과 금액을 먼저 확인해 드려요.</p>
          </div>

          <div className="b1-required">
            <h2>제출할 서류</h2>
            <div className="b1-doc-grid">
              {requiredDocuments.map((document) => <article className="b1-doc-card" key={document.number}>
                <div className="b1-doc-card__top"><span className="b1-doc-card__icon"><FileIcon width={22} height={22} /></span><span className="b1-doc-card__number">{document.number}</span></div>
                <div><h3>{document.name}</h3><p>{document.meta}</p></div>
              </article>)}
            </div>
          </div>
        </section>

        <aside className="b1-identity-column">
          <form className="b1-identity-card" onSubmit={handleSubmit} noValidate>
            <div className="b1-card-head"><h2>본인 확인</h2><p>이름과 학번을 입력하면 서류 제출 화면으로 이동해요.</p></div>
            <div className="b1-fields">
              <label className="b1-field"><span>이름</span><input aria-invalid={Boolean(error)} autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="예) 김청년" value={name} /></label>
              <label className="b1-field"><span>학번</span><input aria-invalid={Boolean(error)} autoComplete="off" inputMode="numeric" onChange={(event) => setStudentId(event.target.value)} placeholder="예) 20231234" value={studentId} /></label>
            </div>
            <div className={`b1-notice ${error ? 'is-error' : ''} ${isVerified ? 'is-success' : ''}`} role={error ? 'alert' : undefined}><InfoIcon /><span>{error || (isVerified ? '본인 확인이 완료되었어요. 제출 화면으로 이동할 수 있어요.' : '담당자가 등록한 명단과 일치해야 해요')}</span></div>
            <Button size="large" type="submit">시작하기 <ArrowRightIcon /></Button>
          </form>

          <section className="b1-downloads">
            <div className="b1-downloads__head"><DownloadIcon /><h2>양식·예시 파일 받기</h2></div>
            <div className="b1-download-list">{downloadFiles.map((file) => <a className="b1-download-item" href="#" key={file.name} onClick={(event) => event.preventDefault()}><span className="b1-download-item__icon"><FileIcon width={18} height={18} /></span><span className="b1-download-item__text"><strong>{file.name}</strong><span className="b1-download-item__meta"><small className="b1-download-item__format">PDF</small><small>{file.size}</small></span></span><DownloadIcon /></a>)}</div>
          </section>
        </aside>
      </div>
    </main>
  )
}
