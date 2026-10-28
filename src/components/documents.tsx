import type { ChangeEvent, ReactNode } from 'react'
import { CheckIcon, ChevronRightIcon, FileIcon, SparklesIcon, UploadIcon, StatusBadge } from './common'
import type { Status } from './common'
import './components.css'

export function UploadedFile({ name, meta, status = 'passed', action }: { name: string; meta?: string; status?: Status; action?: ReactNode }) {
  return <div className="uploaded-file"><span className="file-icon-box"><FileIcon width={20} height={20} /></span><div className="uploaded-file__text"><strong>{name}</strong>{meta && <span>{meta}</span>}</div><div className="uploaded-file__action">{action ?? <StatusBadge status={status} />}</div></div>
}

export function UploadBox({ onFileSelect, accept = '.pdf,.jpg,.jpeg,.png', formats = 'PDF · JPG · PNG', maxSize = '최대 20MB', children }: { onFileSelect?: (file: File) => void; accept?: string; formats?: string; maxSize?: string; children?: ReactNode }) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) onFileSelect?.(file) }
  return <label className="upload-box"><input accept={accept} onChange={handleChange} type="file" /><span className="upload-box__icon"><UploadIcon width={22} height={22} /></span><strong>{children ?? '여기에 파일을 끌어다 놓으세요'}</strong><span>{formats}, {maxSize}</span><span className="upload-box__button">파일 선택</span></label>
}

export function AIResultCard({ title = 'AI 점검 결과', status, summary, findings = [] }: { title?: string; status: 'passed' | 'error' | 'pending' | 'needs-review'; summary?: string; findings?: Array<{ status: 'passed' | 'error' | 'pending'; text: string }> }) {
  return <section className={`ai-result-card ai-result-card--${status}`}><div className="ai-result-card__header"><div className="ai-result-card__title"><span className="ai-result-card__sparkle"><SparklesIcon width={16} height={16} /></span><strong>{title}</strong></div><StatusBadge status={status} /></div>{summary && <p className="ai-result-card__summary">{summary}</p>}{findings.length > 0 && <div className="ai-result-card__findings">{findings.map((finding) => <ChecklistItem key={finding.text} status={finding.status} text={finding.text} />)}</div>}</section>
}

export function ChecklistItem({ status, text, detail }: { status: 'passed' | 'error' | 'pending'; text: string; detail?: string }) {
  const Icon = status === 'passed' ? CheckIcon : status === 'pending' ? SparklesIcon : FileIcon
  return <div className={`checklist-item checklist-item--${status}`}><span className="checklist-item__icon"><Icon width={16} height={16} /></span><div><strong>{text}</strong>{detail && <span>{detail}</span>}</div></div>
}

export function DocumentTab({ label, status, active = false, count, onClick }: { label: string; status?: Status; active?: boolean; count?: number; onClick?: () => void }) {
  return <button className={`document-tab ${active ? 'is-active' : ''}`} onClick={onClick} type="button"><span className="document-tab__label">{label}</span>{typeof count === 'number' && <span className="document-tab__count">{count}</span>}{status && <StatusBadge status={status} />}<ChevronRightIcon className="document-tab__chevron" width={16} height={16} /></button>
}
