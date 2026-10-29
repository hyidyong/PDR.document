import { A3ProfileMenu } from '../auth/A3ProfileMenu'
import { showNotice } from '../store/noticeStore'
import { BrandLogo } from '../components/common'
import { useSessionUser } from '../store/sessionStore'
import { SearchIcon } from './adminIcons'

export type AdminMenu = 'home' | 'project' | 'applicants'
// 홈 = D1; 프로젝트 and 신청자 both open the D5 신청자 목록. 서류 관리 shows a 준비 중 notice.
const menus: { label: string; menu?: AdminMenu }[] = [{ label: '홈', menu: 'home' }, { label: '프로젝트', menu: 'project' }, { label: '신청자', menu: 'applicants' }, { label: '서류 관리' }]
// Shown when 담당자 데모 is opened without logging in.
const demoReviewer = { name: '박담당', email: 'admin@example.com' }

// Reuses the shared .app-header styles; AppHeader itself is fixed to the applicant menu.
// onExit is App's logout, which signs out of Supabase and returns to A1.
// onSwitchRole (logged-in only, not 담당자 데모) returns to the A2 역할 선택.
export function AdminHeader({ active, onNavigate, onExit, onSwitchRole }: { active: AdminMenu; onNavigate: (menu: AdminMenu) => void; onExit: () => void; onSwitchRole?: () => void }) {
  const sessionUser = useSessionUser()
  const user = sessionUser?.role === 'admin' ? sessionUser : demoReviewer

  return <header className="app-header admin-header">
    <BrandLogo onClick={() => onNavigate('home')} />
    <nav aria-label="담당자 메뉴">
      {menus.map(({ label, menu }) => <button aria-current={menu === active ? 'page' : undefined} className={menu === active ? 'is-active' : ''} key={label} onClick={() => menu ? onNavigate(menu) : showNotice(`${label} 화면은 준비 중이에요`)} type="button">{label}</button>)}
    </nav>
    <label className="admin-header__search"><SearchIcon width={16} height={16} /><input aria-label="프로젝트, 신청자 검색" onKeyDown={(event) => { if (event.key === 'Enter') showNotice('검색은 준비 중이에요') }} placeholder="프로젝트, 신청자를 검색해보세요." /></label>
    <A3ProfileMenu email={user.email} name={user.name} onLogout={onExit} onSwitch={onSwitchRole} roleLabel="담당자" switchLabel="사용자 모드로 전환" />
  </header>
}
