import { useEffect, useRef } from 'react'
import { Button } from '../components/common'
import { collectIssueFindings, documentLabels } from './checkModel'
import type { DocumentId, DocumentState, Finding } from './checkModel'

const documentIds: DocumentId[] = ['plan', 'contract', 'receipts']

type ConfirmationItem = {
  key: string
  number: number
  label: string
  status: 'error' | 'review' | 'missing'
}

function AlertTriangleIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M10.3 4.1 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M12 9v4.5M12 17h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
}

function getFindingLabel(finding: Finding) {
  if (finding.number === 1) return `${finding.title} (물품매매계약서)`
  if (finding.number === 2) return `${finding.title} (서류 간 비교)`
  return finding.title
}

export function B4SubmissionConfirm({ documents, onCancel, onConfirm }: {
  documents: DocumentState
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const findings = collectIssueFindings(documents)
  const missingIds = documentIds.filter((id) => !documents[id])
  const items: ConfirmationItem[] = [
    ...findings.map((finding) => ({
      key: `finding-${finding.number}`,
      number: finding.number,
      label: getFindingLabel(finding),
      status: finding.status === 'recommend' ? 'error' as const : 'review' as const,
    })),
    ...missingIds.map((id, index) => ({
      key: `missing-${id}`,
      number: findings.length + index + 1,
      label: `${documentLabels[id]} 파일이 아직 업로드되지 않았어요`,
      status: 'missing' as const,
    })),
  ]
  const errorCount = items.filter((item) => item.status === 'error').length
  const reviewCount = items.filter((item) => item.status === 'review').length
  const isIncomplete = items.length > 0

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null
    const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>('button')
    firstButton?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousActiveElement?.focus()
    }
  }, [onCancel])

  const summaryParts = [
    errorCount ? `오류 ${errorCount}건` : '',
    reviewCount ? `확인 필요 ${reviewCount}건` : '',
    missingIds.length ? `미업로드 ${missingIds.length}건` : '',
  ].filter(Boolean)

  return <div className="check-overlay" role="presentation">
    <div aria-describedby="submit-description" aria-labelledby="submit-title" aria-modal="true" className="submit-confirm" ref={dialogRef} role="dialog">
      <span className="submit-confirm__icon"><AlertTriangleIcon /></span>
      <div className="submit-confirm__copy">
        <h2 id="submit-title">{isIncomplete ? '아직 AI 확인을 받지 않았어요' : '서류를 제출할까요?'}</h2>
        <p id="submit-description">{isIncomplete
          ? <>{summaryParts.join(', ')}이 남아 있어요.<br />지금 제출하면 <strong>'제출(미비)'</strong>로 표시되고,<br />필수 서류나 항목이 빠졌을 수 있어 담당자가<br />보완을 요청할 수 있어요.</>
          : <>모든 서류의 AI 확인이 끝났어요.<br />최종 제출하면 담당자가 서류를 확인할 수 있어요.</>}
        </p>
      </div>
      {items.length > 0 && <div className="submit-confirm__items">
        {items.map((item) => <div className="submit-confirm__item" key={item.key}>
          <span className={`submit-confirm__number is-${item.status}`}>{item.number}</span>
          <span className="submit-confirm__label">{item.label}</span>
          <span className={`submit-confirm__state is-${item.status}`}>{item.status === 'error' ? '오류' : item.status === 'review' ? '확인 필요' : '미업로드'}</span>
        </div>)}
      </div>}
      <div className="submit-confirm__actions">
        <Button onClick={onCancel} size="large">돌아가서 수정하기</Button>
        <button className="submit-confirm__submit" onClick={onConfirm} type="button">{isIncomplete ? '그래도 제출하기' : '최종 제출하기'}</button>
      </div>
    </div>
  </div>
}
