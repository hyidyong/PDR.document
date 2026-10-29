import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { CheckIcon, ChevronDownIcon, FileIcon, SparklesIcon, UploadIcon } from '../components/common'
import { showNotice } from '../store/noticeStore'
import { ClipboardIcon, CloseIcon, PlusIcon, TrashIcon } from './adminIcons'
import { exampleGuide } from './mockAdminData'
import { formatBytes, GUIDE_MAX, newDocument, previewCriteria } from './projectDraft'
import type { DraftDocument, ProjectDraft } from './projectDraft'

const extension = (name: string) => name.split('.').pop()?.toUpperCase().slice(0, 5) ?? ''

function DocumentCard({ index, document, canDelete, onChange, onDelete }: { index: number; document: DraftDocument; canDelete: boolean; onChange: (document: DraftDocument) => void; onDelete: () => void }) {
  const attach = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onChange({ ...document, formFile: { name: file.name, size: file.size } })
  }
  const number = String(index + 1).padStart(2, '0')
  return <section className="wz-card wz-doc">
    <div className="wz-doc__head">
      <span className="wz-doc__index">{number}</span>
      <input aria-label={`${number}번 서류 이름`} className="wz-input wz-doc__name" maxLength={40} onChange={(event) => onChange({ ...document, name: event.target.value })} placeholder="서류 이름" value={document.name} />
      <span className="wz-footer__spacer" />
      <span className="wz-toggle-label">필수</span>
      <button aria-checked={document.required} aria-label={`${document.name || number} 필수 서류`} className={`wz-toggle ${document.required ? 'is-on' : ''}`} onClick={() => onChange({ ...document, required: !document.required })} role="switch" type="button"><span /></button>
      <button aria-label={`${document.name || number} 삭제`} className="wz-icon-button" disabled={!canDelete} onClick={onDelete} title={canDelete ? '삭제' : '서류는 하나 이상 있어야 해요'} type="button"><TrashIcon width={16} height={16} /></button>
    </div>
    <div className="wz-doc__fields">
      <div className="wz-field wz-doc__file">
        <span className="wz-label">양식 파일</span>
        {document.formFile
          ? <div className="wz-file wz-file--compact">
            <span className="wz-file__icon"><FileIcon width={20} height={20} /></span>
            <span className="wz-file__text"><strong>{document.formFile.name}</strong><span>{formatBytes(document.formFile.size)} · 첨부됨</span></span>
            <span className="wz-format">{extension(document.formFile.name)}</span>
            <span className="wz-file__status"><CheckIcon width={16} height={16} />첨부</span>
            <button aria-label={`${document.formFile.name} 빼기`} className="wz-icon-button" onClick={() => onChange({ ...document, formFile: null })} type="button"><CloseIcon width={16} height={16} /></button>
          </div>
          : <label className="wz-dropzone"><input className="wz-hidden-input" onChange={attach} type="file" /><UploadIcon width={18} height={18} />양식 파일 첨부 (선택)</label>}
      </div>
      <label className="wz-field wz-doc__note">
        <span className="wz-label">이 서류만의 추가 안내(선택)</span>
        <input className="wz-input wz-input--tall" maxLength={200} onChange={(event) => onChange({ ...document, note: event.target.value })} placeholder="신청자에게 따로 알려줄 내용이 있으면 적어주세요" value={document.note} />
      </label>
    </div>
  </section>
}

// D3 제출 서류: 공고문(제출 안내·기준), "AI가 이해한 기준 미리보기" (a demo preview, not real AI), and the 서류 cards.
export function D3Documents({ draft, onChange }: { draft: ProjectDraft; onChange: (draft: ProjectDraft) => void }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const criteria = previewCriteria(draft.guide)
  const setDocument = (key: string, next: DraftDocument) => onChange({ ...draft, documents: draft.documents.map((doc) => (doc.key === key ? next : doc)) })

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) { showNotice('클립보드가 비어 있어요'); return }
      onChange({ ...draft, guide: text.slice(0, GUIDE_MAX) })
    } catch {
      showNotice('브라우저가 붙여넣기를 막았어요. 칸을 누르고 Ctrl+V로 붙여넣어 주세요')
    }
  }

  return <>
    <section className="wz-card wz-guide">
      <div className="wz-guide__head">
        <h2>제출 안내·기준</h2>
        <span className="wz-guide__actions">
          <button className="wz-link-button" onClick={() => onChange({ ...draft, guide: exampleGuide })} type="button">예시 공고문 넣기</button>
          <button className="wz-chip-button" onClick={() => void paste()} type="button"><ClipboardIcon width={13} height={13} />클립보드에서 붙여넣기</button>
        </span>
      </div>
      <label className="wz-textarea">
        <textarea aria-label="제출 안내·기준" maxLength={GUIDE_MAX} onChange={(event) => onChange({ ...draft, guide: event.target.value })} placeholder="공고문, 안내 메일, 유의사항을 그대로 붙여넣어 주세요. 신청자가 서류를 올리면 이 내용을 기준으로 검사해요" value={draft.guide} />
        <span className="wz-counter">{draft.guide.length.toLocaleString()} / {GUIDE_MAX.toLocaleString()}자</span>
      </label>
      <button aria-expanded={previewOpen} className="wz-preview-toggle" onClick={() => setPreviewOpen(!previewOpen)} type="button">AI가 이해한 기준 미리보기<ChevronDownIcon className={previewOpen ? 'is-flipped' : ''} width={14} height={14} /></button>
      {previewOpen && <div className="wz-criteria">
        {criteria.length
          ? <ul>{criteria.map((item, index) => <li key={index}><SparklesIcon width={14} height={14} />{item}</li>)}</ul>
          : <p>붙여넣은 공고문에서 기준을 찾지 못했어요. 공고문을 넣으면 여기에 기준이 정리돼요.</p>}
        <small>시연용 예시예요. 실제 서비스에서는 AI가 공고문을 읽고 검사 기준을 만들어요.</small>
      </div>}
    </section>

    <div className="wz-docs-head"><h2>제출 서류</h2><span>{draft.documents.length}개</span></div>
    {draft.documents.map((doc, index) => <DocumentCard
      canDelete={draft.documents.length > 1}
      document={doc}
      index={index}
      key={doc.key}
      onChange={(next) => setDocument(doc.key, next)}
      onDelete={() => onChange({ ...draft, documents: draft.documents.filter((item) => item.key !== doc.key) })}
    />)}
    <button className="wz-add" onClick={() => onChange({ ...draft, documents: [...draft.documents, newDocument()] })} type="button"><PlusIcon width={16} height={16} />서류 추가</button>
  </>
}
