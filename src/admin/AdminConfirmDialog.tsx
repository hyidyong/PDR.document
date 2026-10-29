import { useEffect, useRef } from 'react'
import { Button } from '../components/common'

// Reuses the .check-overlay / .submit-confirm styles of the applicant confirm dialogs (B4·B6).
export function AdminConfirmDialog({ title, description, confirmLabel, cancelLabel = '취소', busy = false, onConfirm, onCancel }: {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef(onCancel)
  useEffect(() => { cancelRef.current = onCancel }, [onCancel])

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelRef.current() }
    window.addEventListener('keydown', handleKeyDown)
    return () => { window.removeEventListener('keydown', handleKeyDown); previousActiveElement?.focus() }
  }, [])

  return <div className="check-overlay" role="presentation"><div aria-describedby="admin-confirm-description" aria-labelledby="admin-confirm-title" aria-modal="true" className="submit-confirm" ref={dialogRef} role="dialog">
    <div className="submit-confirm__copy"><h2 id="admin-confirm-title">{title}</h2><p id="admin-confirm-description">{description}</p></div>
    <div className="submit-confirm__actions"><Button disabled={busy} onClick={onConfirm} size="large">{confirmLabel}</Button><button className="submit-confirm__submit" onClick={onCancel} type="button">{cancelLabel}</button></div>
  </div></div>
}
