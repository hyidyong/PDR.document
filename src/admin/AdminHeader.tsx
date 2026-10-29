import { useEffect, useState } from 'react'
import { A3ProfileMenu } from '../auth/A3ProfileMenu'
import { BrandLogo } from '../components/common'
import { useSessionUser } from '../store/sessionStore'
import { SearchIcon } from './adminIcons'

const menus = ['홈', '프로젝트', '신청자', '서류 관리']
// Shown when 담당자 데모 is opened without logging in.
const demoReviewer = { name: '박담당', email: 'admin@example.com' }

// Reuses the shared .app-header styles; AppHeader itself is fixed to the applicant menu.
// onExit is App's logout, which signs out of Supabase and returns to A1.
// onSwitchRole (logged-in only, not 담당자 데모) returns to the A2 역할 선택.
export function AdminHeader({ onHome, onExit, onSwitchRole }: { onHome: () => void; onExit: () => void; onSwitchRole?: () => void }) {
  const sessionUser = useSessionUser()
  const user = sessionUser?.role === 'admin' ? sessionUser : demoReviewer
  // Only 프로젝트 (D5) is built; the other menus show a short not-ready notice.
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2500)
    return () => window.clearTimeout(timer)
  }, [notice])

  return <header className="app-header admin-header">
    <BrandLogo onClick={onHome} />
    <nav aria-label="담당자 메뉴">
      {menus.map((menu) => <button aria-current={menu === '프로젝트' ? 'page' : undefined} className={menu === '프로젝트' ? 'is-active' : ''} key={menu} onClick={menu === '프로젝트' ? onHome : () => setNotice(`${menu} 화면은 준비 중이에요`)} type="button">{menu}</button>)}
      {notice && <p className="admin-header__notice" role="status">{notice}</p>}
    </nav>
    <label className="admin-header__search"><SearchIcon width={16} height={16} /><input aria-label="프로젝트, 신청자 검색" placeholder="프로젝트, 신청자를 검색해보세요." /></label>
    <A3ProfileMenu email={user.email} name={user.name} onLogout={onExit} onSwitch={onSwitchRole} roleLabel="담당자" switchLabel="사용자 모드로 전환" />
  </header>
}
