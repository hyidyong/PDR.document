import { useState } from 'react'
import { Button, CheckIcon } from '../components/common'
import { InfoIcon, MessageIcon } from './adminIcons'

const MAX_LENGTH = 500

export function D7RevisionPanel({ comment, onCommentChange, onCancel, onSend }: { comment: string; onCommentChange: (comment: string) => void; onCancel: () => void; onSend: (comment: string, attachAi: boolean) => Promise<void> }) {
  const [attachAi, setAttachAi] = useState(true)
  const [sending, setSending] = useState(false)
  // The panel unmounts once the request is sent, so sending only needs resetting on failure.
  const send = async () => {
    setSending(true)
    try { await onSend(comment.trim(), attachAi) } catch (error) { console.error(error); setSending(false) }
  }
  return <>
    <span className="admin-label"><MessageIcon className="admin-label__icon" width={14} height={14} />보완 요청 내용</span>
    <div className="admin-textarea admin-textarea--tall">
      <textarea aria-label="보완 요청 내용" autoFocus maxLength={MAX_LENGTH} onChange={(event) => onCommentChange(event.target.value)} placeholder="보완이 필요한 내용을 적어주세요" value={comment} />
      <span className="admin-textarea__counter">{comment.length} / {MAX_LENGTH}</span>
    </div>
    <label className="admin-attach">
      <input checked={attachAi} onChange={(event) => setAttachAi(event.target.checked)} type="checkbox" />
      <span className={`admin-checkbox ${attachAi ? 'is-checked' : ''}`} aria-hidden="true">{attachAi && <CheckIcon width={12} height={12} />}</span>
      AI 검사 결과도 함께 보내기
    </label>
    <div className="admin-actions admin-actions--revision">
      <Button onClick={onCancel} variant="secondary">취소</Button>
      <Button disabled={!comment.trim() || sending} onClick={send}>보완 요청 보내기</Button>
    </div>
    <p className="admin-notice"><InfoIcon width={13} height={13} />신청자에게 이메일로 알려드려요.</p>
  </>
}
