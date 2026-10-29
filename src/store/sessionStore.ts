// Who is signed in, for the screens to show (e.g. the A3 프로필 메뉴).
// The login token itself is kept by the Supabase client (src/supabase.ts); screens never read it directly.
import { useSyncExternalStore } from 'react'
import type { SessionUser } from '../api/authApi'

let current: SessionUser | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export function getSessionUser() {
  return current
}

export function setSessionUser(user: SessionUser) {
  current = user
  emit()
}

export function clearSessionUser() {
  current = null
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useSessionUser() {
  return useSyncExternalStore(subscribe, getSessionUser, getSessionUser)
}
