import { logout } from '../api/authApi'
import { A3ProfileMenu } from '../auth/A3ProfileMenu'
import { BrandLogo } from '../components/common'
import { clearSession, useSession } from '../store/sessionStore'
import { SearchIcon } from './adminIcons'

const menus = ['홈', '프로젝트', '신청자', '서류 관리']
// Shown when 담당자 데모 is opened without logging in.
const demoReviewer = { name: '박담당', email: 'admin@example.com' }

// Reuses the shared .app-header styles; AppHeader itself is fixed to the applicant menu.
export function AdminHeader({ onHome, onExit }: { onHome: () => void; onExit: () => void }) {
  const session = useSession()
  const user = session?.user.role === 'REVIEWER' ? session.user : demoReviewer
  const signOut = async () => {
    try { await logout() } catch (error) { console.error(error) }
    clearSession()
    onExit()
  }

  return <header className="app-header admin-header">
    <BrandLogo onClick={onHome} />
    <nav aria-label="담당자 메뉴">
      {menus.map((menu) => <button aria-current={menu === '프로젝트' ? 'page' : undefined} className={menu === '프로젝트' ? 'is-active' : ''} key={menu} onClick={onHome} type="button">{menu}</button>)}
    </nav>
    <label className="admin-header__search"><SearchIcon width={16} height={16} /><input aria-label="프로젝트, 신청자 검색" placeholder="프로젝트, 신청자를 검색해보세요." /></label>
    <A3ProfileMenu email={user.email} name={user.name} onLogout={signOut} roleLabel="담당자" switchLabel="신청자 모드로 전환" />
  </header>
}
