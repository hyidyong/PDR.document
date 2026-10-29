import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDownIcon } from '../components/common'
import { showNotice } from '../store/noticeStore'
import './A3ProfileMenu.css'

function SwitchIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4 8h15m0 0-4-4m4 4-4 4M20 16H5m0 0 4-4m-4 4 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function SettingsIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>
}

function LogoutIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M14 4.5H6.5v15H14M10 12h10m0 0-3.5-3.5M20 12l-3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

// A3 프로필 메뉴. 모드 전환 calls onSwitch when given (back to the A2 역할 선택); otherwise it and 설정 show the shared 준비 중 notice.
export function A3ProfileMenu({ name, email, roleLabel, switchLabel, onLogout, onSwitch }: { name: string; email: string; roleLabel: string; switchLabel: string; onLogout: () => void; onSwitch?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initial = name.slice(0, 1)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [open])

  const toggle = () => setOpen(!open)
  const item = (label: string, icon: ReactNode, onClick: () => void, className = '') => <button className={`a3-menu__item ${className}`} onClick={onClick} role="menuitem" type="button">{icon}{label}</button>

  return <div className="a3-profile" ref={ref}>
    <button aria-expanded={open} aria-haspopup="menu" className="a3-profile__trigger" onClick={toggle} type="button">
      <span className="a3-avatar">{initial}</span>{name}님<ChevronDownIcon className={open ? 'is-flipped' : ''} width={16} height={16} />
    </button>
    {open && <div aria-label="프로필 메뉴" className="a3-menu" role="menu">
      <div className="a3-menu__account">
        <span className="a3-avatar a3-avatar--large">{initial}</span>
        <div><div className="a3-menu__name"><strong>{name}</strong><span>{roleLabel}</span></div><small>{email}</small></div>
      </div>
      {item(switchLabel, <SwitchIcon />, onSwitch ?? (() => showNotice()), 'is-strong')}
      {item('설정', <SettingsIcon />, () => showNotice())}
      <hr />
      {item('로그아웃', <LogoutIcon />, onLogout, 'is-muted')}
    </div>}
  </div>
}
