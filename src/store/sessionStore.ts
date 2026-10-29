// The one place that holds the login token and user. Screens read it through useSession()/getSession().
// It lives in memory; with 로그인 상태 유지 it is also written to localStorage so a reload keeps it.
import { useSyncExternalStore } from 'react'
import type { Session } from '../api/authApi'

const STORAGE_KEY = 'modit.session.v1'

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const { token, user } = value as Partial<Session>
  return typeof token === 'string' && !!user && typeof user.name === 'string' && typeof user.email === 'string' && (user.role === 'APPLICANT' || user.role === 'REVIEWER')
}

function readStored(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeStored(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the session still works until the page is reloaded.
  }
}

let current = readStored()
// The session found in storage at page load, until A1 uses it to skip the login screen.
let restored = current
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export function getSession() {
  return current
}

export function saveSession(session: Session, keepSignedIn: boolean) {
  current = session
  restored = null
  writeStored(keepSignedIn ? session : null)
  emit()
}

export function clearSession() {
  current = null
  restored = null
  writeStored(null)
  emit()
}

/** Returns the session restored from 로그인 상태 유지 once per page load, then null. */
export function takeRestoredSession() {
  const session = restored
  restored = null
  return session
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useSession() {
  return useSyncExternalStore(subscribe, getSession, getSession)
}
