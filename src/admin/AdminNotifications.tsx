import { useEffect, useMemo, useRef, useState } from 'react'
import { useAdmin } from '../store/AdminStore'
import '../auth/notifyBell.css'
import { BellIcon } from './adminIcons'
import { formatShort } from './mockAdminData'
import type { AdminEvent } from './mockAdminData'

const LIMIT = 10
type Notice = { key: string; applicantId: string; at: string; text: string; tone: AdminEvent['tone'] }

function describe(name: string, event: AdminEvent) {
  if (event.kind === 'submit') return event.label === '제출(미비)' ? `${name}님이 서류를 제출했어요 · 미비` : `${name}님이 서류를 제출했어요`
  if (event.kind === 'resubmit') return `${name}님이 서류를 다시 제출했어요`
  if (event.kind === 'revision') return `${name}님에게 보완 요청을 보냈어요`
  return `${name}님의 서류를 승인했어요`
}

// 알림 벨 (D1 design: lucide bell + unread dot). Lists the latest 제출·재제출·보완 요청·승인 from the mock events;
// opening it marks them read, and choosing one opens that 신청자 on D6.
export function AdminNotifications({ onOpenApplicant }: { onOpenApplicant: (applicantId: string) => void }) {
  const { applicants, eventsById, notificationsReadAt, markNotificationsRead } = useAdmin()
  const [open, setOpen] = useState(false)
  // readAt from before this opening, so the items that were new stay marked while the list is open.
  const [seenBefore, setSeenBefore] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const notices = useMemo(() => {
    const names = new Map(applicants.map((applicant) => [applicant.applicantId, applicant.name]))
    const list: Notice[] = []
    for (const [applicantId, events] of Object.entries(eventsById)) {
      const name = names.get(applicantId)
      if (!name) continue
      events.forEach((event, index) => {
        if (event.kind === 'submit' || event.kind === 'resubmit' || event.kind === 'revision' || event.kind === 'approved') list.push({ key: `${applicantId}-${index}`, applicantId, at: event.at, text: describe(name, event), tone: event.tone })
      })
    }
    return list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, LIMIT)
  }, [applicants, eventsById])
  const isNew = (notice: Notice, readAt: string | null) => !readAt || Date.parse(notice.at) > Date.parse(readAt)
  const unread = notices.some((notice) => isNew(notice, notificationsReadAt))

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [open])

  const toggle = () => {
    if (!open) { setSeenBefore(notificationsReadAt); if (unread) void markNotificationsRead() }
    setOpen(!open)
  }
  const choose = (applicantId: string) => { setOpen(false); onOpenApplicant(applicantId) }

  return <div className="notify-bell" ref={ref}>
    <button aria-expanded={open} aria-haspopup="menu" aria-label={unread ? '알림 (새 알림 있음)' : '알림'} className="notify-bell__bell" onClick={toggle} type="button">
      <BellIcon width={22} height={22} />
      {unread && <span aria-hidden="true" className="notify-bell__dot" />}
    </button>
    {open && <div aria-label="알림" className="notify-bell__menu" role="menu">
      <div className="notify-bell__head"><strong>알림</strong><span>최근 {notices.length}개</span></div>
      {notices.length === 0
        ? <p className="notify-bell__empty">아직 알림이 없어요.</p>
        : notices.map((notice) => <button className={`notify-bell__item ${isNew(notice, seenBefore) ? 'is-new' : ''}`} key={notice.key} onClick={() => choose(notice.applicantId)} role="menuitem" type="button">
          <span className={`notify-bell__tone notify-bell__tone--${notice.tone}`} />
          <span className="notify-bell__text"><span>{notice.text}</span><small>{formatShort(notice.at)}</small></span>
        </button>)}
    </div>}
  </div>
}
