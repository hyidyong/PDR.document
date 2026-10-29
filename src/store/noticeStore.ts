// A short notice for buttons whose feature is not built yet ("준비 중이에요").
// Any screen calls showNotice(); <ReadyNotice /> (src/auth) placed once per screen root shows it for a moment.
import { useSyncExternalStore } from 'react'

export const NOT_READY = '준비 중이에요'

let current = ''
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export function showNotice(message = NOT_READY) {
  current = message
  emit()
}

export function clearNotice() {
  current = ''
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
const getNotice = () => current

export function useNotice() {
  return useSyncExternalStore(subscribe, getNotice, getNotice)
}
