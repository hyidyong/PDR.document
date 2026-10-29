// Shows the notice from src/store/noticeStore.ts for 2.5s. Place once per screen root.
import { useEffect } from 'react'
import { clearNotice, useNotice } from '../store/noticeStore'
import './ReadyNotice.css'

export function ReadyNotice() {
  const notice = useNotice()
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(clearNotice, 2500)
    return () => window.clearTimeout(timer)
  }, [notice])
  return <div aria-live="polite" className="ready-notice" role="status">{notice && <p>{notice}</p>}</div>
}
