import { useEffect, useRef, useState } from 'react'
import { loadApplicantNotices, markNoticesRead, NOTICES_READ_EVENT, readNoticeKeys } from '../store/applicantNotices'
import type { ApplicantNotice } from '../store/applicantNotices'
import './notifyBell.css'

const LIMIT = 10
const pad = (value: number) => String(value).padStart(2, '0')
/** "10.28 15:20" */
const shortTime = (iso: string) => { const date = new Date(iso); return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}` }

function BellIcon() {
  return <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
}

// 신청자 알림 벨, same look as the 담당자 one (src/admin/AdminNotifications.tsx): 보완 요청 받음, 승인됨, AI 점검 결과, 마감 임박.
// Opening it marks the list read; choosing an item opens 서류 점검 (onOpen).
export function ApplicantNotifications({ onOpen }: { onOpen: () => void }) {
  const [notices, setNotices] = useState<ApplicantNotice[]>([])
  const [open, setOpen] = useState(false)
  // Keys that were new when the list was opened, so they stay marked while it is open.
  const [newKeys, setNewKeys] = useState<Set<string>>(() => new Set())
  const [read, setRead] = useState(readNoticeKeys)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    void loadApplicantNotices().then((list) => { if (active) setNotices(list.slice(0, LIMIT)) })
    const refreshRead = () => setRead(readNoticeKeys())
    window.addEventListener(NOTICES_READ_EVENT, refreshRead)
    return () => { active = false; window.removeEventListener(NOTICES_READ_EVENT, refreshRead) }
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [open])

  const unread = notices.some((notice) => !read.has(notice.key))

  const toggle = async () => {
    if (open) { setOpen(false); return }
    const list = (await loadApplicantNotices(true)).slice(0, LIMIT)
    setNotices(list)
    const before = readNoticeKeys()
    setNewKeys(new Set(list.filter((notice) => !before.has(notice.key)).map((notice) => notice.key)))
    markNoticesRead(list)
    setOpen(true)
  }
  const choose = () => { setOpen(false); onOpen() }

  return <div className="notify-bell notify-bell--push" ref={ref}>
    <button aria-expanded={open} aria-haspopup="menu" aria-label={unread ? '알림 (새 알림 있음)' : '알림'} className="notify-bell__bell" onClick={() => void toggle()} type="button">
      <BellIcon />
      {unread && <span aria-hidden="true" className="notify-bell__dot" />}
    </button>
    {open && <div aria-label="알림" className="notify-bell__menu" role="menu">
      <div className="notify-bell__head"><strong>알림</strong><span>최근 {notices.length}개</span></div>
      {notices.length === 0
        ? <p className="notify-bell__empty">아직 알림이 없어요.</p>
        : notices.map((notice) => <button className={`notify-bell__item ${newKeys.has(notice.key) ? 'is-new' : ''}`} key={notice.key} onClick={choose} role="menuitem" type="button">
          <span className={`notify-bell__tone notify-bell__tone--${notice.tone}`} />
          <span className="notify-bell__text"><span>{notice.text}</span><small>{shortTime(notice.at)}</small></span>
        </button>)}
    </div>}
  </div>
}
