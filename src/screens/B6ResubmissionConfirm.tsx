import { useEffect, useRef } from 'react'
import { Button } from '../components/common'
import { documentLabels } from './checkModel'
import type { DocumentId } from './checkModel'

export function B6ResubmissionConfirm({ requestedIds, onCancel, onConfirm }: {
  requestedIds: DocumentId[]
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handleKeyDown)
    return () => { window.removeEventListener('keydown', handleKeyDown); previousActiveElement?.focus() }
  }, [onCancel])

  return <div className="check-overlay" role="presentation"><div aria-describedby="resubmit-description" aria-labelledby="resubmit-title" aria-modal="true" className="submit-confirm" ref={dialogRef} role="dialog">
    <div className="submit-confirm__copy"><h2 id="resubmit-title">수정본을 다시 제출할까요?</h2><p id="resubmit-description">{requestedIds.map((id) => documentLabels[id]).join(', ')} 수정본의 AI 확인이 완료됐어요. 최종 확인 후 담당자 검토 대기 상태로 변경돼요.</p></div>
    <div className="submit-confirm__actions"><Button onClick={onCancel} size="large">돌아가서 수정하기</Button><button className="submit-confirm__submit" onClick={onConfirm} type="button">최종 재제출하기</button></div>
  </div></div>
}
