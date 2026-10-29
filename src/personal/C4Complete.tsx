import { Button, CheckIcon, FileIcon, StatusBadge } from '../components/common'
import { RecentCard } from './C2CriteriaInput'
import { doneRecentChecks, fileFormat, formatMonthDay, formatSize, mockDeadline } from './personalMock'
import type { Criteria, PersonalUpload } from './personalMock'

function DownloadIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function FilePlusIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M6.5 3.5h7l4 4v13h-11v-17Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M13.5 3.5v4h4M12 11v6M9 14h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function HouseIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function MegaphoneIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4 10v4h3l7 4V6l-7 4H4ZM17 9.5a3.5 3.5 0 0 1 0 5M8 14l1 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function dDay(deadline: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((deadline.getTime() - today.getTime()) / 86400000)
  return days === 0 ? 'D-DAY' : days > 0 ? `D-${days}` : `D+${-days}`
}

export function C4Complete({ criteria, uploads, checkedAt, onCheckAnother, onHome }: { criteria: Criteria; uploads: PersonalUpload[]; checkedAt: Date; onCheckAnother: () => void; onHome: () => void }) {
  const ruleCount = Object.values(criteria.rules).reduce((sum, rules) => sum + rules.length, 0)
  const downloadAll = () => uploads.forEach(({ file }) => {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  })

  return <main className="personal-main">
    <div className="personal-page-header"><h1>{criteria.title} 서류</h1><p>{criteria.term} · {formatMonthDay(checkedAt)} 점검</p></div>
    <div className="personal-body">
      <div className="personal-content">
        <section className="personal-card c4-hero">
          <span className="c4-hero__circle"><CheckIcon /></span>
          <div><h2>제출해도 좋아요</h2><p>서류 {criteria.docs.length}개 · 기준 {ruleCount}개 모두 통과</p></div>
        </section>

        <section className="personal-card c4-section">
          <h2 className="c4-section__title"><MegaphoneIcon />제출 안내</h2>
          <div className="c4-guide"><strong>{criteria.rules.submit.map((rule) => rule.text).join(' · ').replace('까지 · ', '까지 ')}</strong><span className="c4-dday">{dDay(mockDeadline)}</span></div>
        </section>

        <section className="personal-card c4-section">
          <div className="c4-section__head"><h2 className="c4-section__title"><CheckIcon />확인받은 파일</h2><Button variant="secondary" onClick={downloadAll}><span className="personal-button-inner"><DownloadIcon />전체 다운로드</span></Button></div>
          <ul className="c4-files">{uploads.map(({ file }, index) => <li key={index}>
            <span className="c4-files__icon"><FileIcon /></span>
            <div><strong>{file.name}</strong><span><b className="personal-format">{fileFormat(file)}</b>{criteria.docs[index]?.name} · {formatSize(file.size)}</span></div>
            <StatusBadge status="passed" />
          </li>)}</ul>
        </section>

        <div className="personal-bottom-row personal-bottom-row--end">
          <Button variant="secondary" size="large" onClick={onCheckAnother}><span className="personal-button-inner"><FilePlusIcon />다른 서류 점검하기</span></Button>
          <Button size="large" onClick={onHome}><span className="personal-button-inner"><HouseIcon />홈으로</span></Button>
        </div>
      </div>
      <aside className="personal-aside"><RecentCard items={doneRecentChecks} /></aside>
    </div>
  </main>
}
