// Browser 뒤로가기 support. Each screen change is recorded with history.pushState;
// on popstate, App (screen, 신청자 page) and AdminApp (menu, open 신청자, D7) restore the state they own.
import { useEffect, useRef } from 'react'
import type { AdminMenu } from '../admin/AdminHeader'
import type { MainPage } from '../components/common'

export type AppScreen = 'login' | 'role' | 'applicant' | 'admin' | 'personal'
// wizardStep: 새 프로젝트 만들기 step (1 기본 정보 ~ 4 링크 공유) when the wizard is open.
// projectId: the project whose D5 is open under 프로젝트 (none = D12 프로젝트 목록).
export type AdminNav = { menu: AdminMenu; openId: string | null; revision: boolean; wizardStep?: 1 | 2 | 3 | 4; projectId?: string }
// demo: 담당자 데모 opened without a login, so it may be revisited after 로그아웃.
export type NavState = { screen: AppScreen; page?: MainPage; demo?: boolean; admin?: AdminNav }
type StoredNav = NavState & { modit: true }

export const defaultAdminNav: AdminNav = { menu: 'home', openId: null, revision: false }

const currentUrl = () => `${window.location.pathname}${window.location.search}${window.location.hash}`
const isNav = (value: unknown): value is StoredNav => Boolean(value && typeof value === 'object' && (value as StoredNav).modit)

export function currentNav(): NavState | null {
  const state: unknown = window.history.state
  return isNav(state) ? state : null
}

export function pushNav(state: NavState, url = currentUrl()) {
  window.history.pushState({ ...state, modit: true }, '', url)
}

export function replaceNav(state: NavState, url = currentUrl()) {
  window.history.replaceState({ ...state, modit: true }, '', url)
}

/**
 * [역할 다시 고르기] in the 프로필 메뉴: records an A2 entry and lets App show it through its usual popstate handling,
 * so App needs no extra wiring and 뒤로가기 from A2 returns to the screen it was opened from.
 */
export function openRoleSelect() {
  const state: StoredNav = { screen: 'role', modit: true }
  window.history.pushState(state, '', '/')
  window.dispatchEvent(new PopStateEvent('popstate', { state }))
}

/** Calls handler with the restored state on 뒤로가기/앞으로가기 (null for entries this app did not write). */
export function usePopNav(handler: (state: NavState | null) => void) {
  const latest = useRef(handler)
  useEffect(() => { latest.current = handler })
  useEffect(() => {
    const onPop = (event: PopStateEvent) => latest.current(isNav(event.state) ? event.state : null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}
