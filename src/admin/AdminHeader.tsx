import { BrandLogo } from '../components/common'
import { SearchIcon } from './adminIcons'

const menus = ['홈', '프로젝트', '신청자', '서류 관리']

// Reuses the shared .app-header styles; AppHeader itself is fixed to the applicant menu.
export function AdminHeader({ onHome, onExit }: { onHome: () => void; onExit: () => void }) {
  return <header className="app-header admin-header">
    <BrandLogo onClick={onHome} />
    <nav aria-label="담당자 메뉴">
      {menus.map((menu) => <button aria-current={menu === '프로젝트' ? 'page' : undefined} className={menu === '프로젝트' ? 'is-active' : ''} key={menu} onClick={onHome} type="button">{menu}</button>)}
    </nav>
    <label className="admin-header__search"><SearchIcon width={16} height={16} /><input aria-label="프로젝트, 신청자 검색" placeholder="프로젝트, 신청자를 검색해보세요." /></label>
    <button className="app-header__profile admin-header__profile" onClick={onExit} title="신청자 화면으로 돌아가기" type="button"><span className="admin-header__avatar">박</span>박담당님<span>나가기</span></button>
  </header>
}
