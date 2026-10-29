import type { ReactNode, SVGProps } from 'react'
import moditLogo from '../assets/modit-logo.png'
import { A3ProfileMenu } from '../auth/A3ProfileMenu'
import { ApplicantNotifications } from '../auth/ApplicantNotifications'
import { openRoleSelect } from '../store/navHistory'
import { useSessionUser } from '../store/sessionStore'
import './components.css'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>{children}</svg>
}

export function ChevronDownIcon(props: IconProps) { return <Icon {...props}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></Icon> }
export function ChevronRightIcon(props: IconProps) { return <Icon {...props}><path d="m9 6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></Icon> }
export function FileIcon(props: IconProps) { return <Icon {...props}><path d="M6.5 3.5h7l4 4v13h-11v-17Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M13.5 3.5v4h4M9 12h6M9 15.5h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></Icon> }
export function UploadIcon(props: IconProps) { return <Icon {...props}><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v4h14v-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></Icon> }
export function SparklesIcon(props: IconProps) { return <Icon {...props}><path d="m12 3 1.2 4.3L17.5 9l-4.3 1.2L12 14.5l-1.2-4.3L6.5 9l4.3-1.7L12 3ZM18.5 14l.65 2.35L21.5 17l-2.35.65L18.5 20l-.65-2.35L15.5 17l2.35-.65L18.5 14Z" fill="currentColor" /></Icon> }
export function CheckIcon(props: IconProps) { return <Icon {...props}><path d="m5 12.5 4.2 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon> }
export function PencilIcon(props: IconProps) { return <Icon {...props}><path d="m15.5 5.5 3 3M5 19l3.8-.8L19.2 7.8a2.1 2.1 0 0 0-3-3L5.8 15.2 5 19Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></Icon> }

export type MainPage = 'home' | 'check' | 'inbox' | 'guide'

export function BrandLogo({ onClick }: { onClick?: () => void }) {
  const image = <img alt="MODIT 홈" className="brand-logo__image" src={moditLogo} />
  return onClick
    ? <button className="brand-logo" onClick={onClick} type="button">{image}</button>
    : <div className="brand-logo">{image}</div>
}

export function MainNavigation({ activePage, onNavigate }: { activePage: MainPage; onNavigate: (page: MainPage) => void }) {
  return <nav aria-label="주요 메뉴">
    <button aria-current={activePage === 'home' ? 'page' : undefined} className={activePage === 'home' ? 'is-active' : ''} onClick={() => onNavigate('home')} type="button">홈</button>
    <button aria-current={activePage === 'check' ? 'page' : undefined} className={activePage === 'check' ? 'is-active' : ''} onClick={() => onNavigate('check')} type="button">서류 점검</button>
    <button aria-current={activePage === 'inbox' ? 'page' : undefined} className={activePage === 'inbox' ? 'is-active' : ''} onClick={() => onNavigate('inbox')} type="button">내 제출함</button>
    <button aria-current={activePage === 'guide' ? 'page' : undefined} className={activePage === 'guide' ? 'is-active' : ''} onClick={() => onNavigate('guide')} type="button">이용 가이드</button>
  </nav>
}

// 로그아웃 headers show the 알림 벨 and the A3 프로필 메뉴 like the 담당자 header (name·email from the signed-in session when there is one);
// other actions (개인 점검 [나가기]) keep the plain button and no bell.
export function AppHeader({ activePage, onNavigate, onLogout, profileName = '김청년', actionLabel = '로그아웃' }: { activePage: MainPage; onNavigate: (page: MainPage) => void; onLogout: () => void; profileName?: string; actionLabel?: string }) {
  const sessionUser = useSessionUser()
  return <header className="app-header">
    <BrandLogo onClick={() => onNavigate('home')} />
    <MainNavigation activePage={activePage} onNavigate={onNavigate} />
    {actionLabel === '로그아웃'
      ? <><ApplicantNotifications onOpen={() => onNavigate('check')} /><A3ProfileMenu email={sessionUser?.email ?? ''} name={sessionUser?.name ?? profileName} onLogout={onLogout} onSwitchRole={sessionUser ? openRoleSelect : undefined} roleLabel="사용자" /></>
      : <button aria-label={`${profileName} ${actionLabel}`} className="app-header__profile" onClick={onLogout} title={actionLabel} type="button">{profileName} <span>{actionLabel}</span></button>}
  </header>
}

export function TopNav({ activeItem = '나의 서류함', profileName = '김청년', onNewCheck }: { activeItem?: string; profileName?: string; onNewCheck?: () => void }) {
  return <header className="top-nav"><BrandLogo /><nav className="top-nav__links" aria-label="주요 메뉴">{['나의 서류함', '새로 점검하기'].map((item) => <button className={`top-nav__link ${activeItem === item ? 'is-active' : ''}`} key={item} onClick={item === '새로 점검하기' ? onNewCheck : undefined} type="button">{item}</button>)}</nav><button className="profile-button" type="button"><span className="profile-button__avatar">김</span><span>{profileName}</span><ChevronDownIcon width={16} height={16} /></button></header>
}

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'
export function Button({ children, variant = 'primary', size = 'medium', disabled = false, type = 'button', onClick }: { children: ReactNode; variant?: ButtonVariant; size?: 'small' | 'medium' | 'large'; disabled?: boolean; type?: 'button' | 'submit' | 'reset'; onClick?: () => void }) {
  return <button className={`button button--${variant} button--${size}`} disabled={disabled} onClick={onClick} type={type}>{children}</button>
}

export type Status = 'not-submitted' | 'submitted' | 'incomplete' | 'checking' | 'needs-review' | 'resubmit' | 'approved' | 'passed' | 'error' | 'pending'
const statusLabels: Record<Status, string> = { 'not-submitted': '미제출', submitted: '제출', incomplete: '제출(미비)', checking: '검토 중', 'needs-review': '보완 필요', resubmit: '재제출', approved: '승인', passed: '통과', error: '오류', pending: '확인 필요' }
export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return <span className={`status-badge status-badge--${status}`}><span className="status-badge__dot" />{label ?? statusLabels[status]}</span>
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-header"><div>{eyebrow && <span className="section-header__eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{action && <div className="section-header__action">{action}</div>}</div>
}
