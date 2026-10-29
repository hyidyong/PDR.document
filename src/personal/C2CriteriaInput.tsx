import { useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Button, ChevronRightIcon, FileIcon, UploadIcon } from '../components/common'
import { acceptedFormats, acceptedFormatsLabel, fileFormat, formatSize, isAcceptedFile, recentChecks } from './personalMock'
import { generateDocumentChecklist } from '../api'
import type { ChecklistResponse } from '../api'

const maxLength = 5000

function ClipboardIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><rect height="15" rx="2" stroke="currentColor" strokeWidth="1.7" width="12" x="6" y="5" /><path d="M9 5V3.5h6V5M9 10h6M9 14h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function ListChecksIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="m3.5 6 1.5 1.5L8 4.5M3.5 12.5 5 14l3-3M3.5 19 5 20.5l3-3M11 6h9.5M11 12.5h9.5M11 19h9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
}

function InfoIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" /><path d="M12 10.5v5M12 7.8v.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
}

export function RecentCard({ items }: { items: Array<{ name: string; meta: string; state: string; passed?: boolean }> }) {
  return <section className="personal-card personal-recent">
    <div className="personal-recent__head"><h2>최근 점검한 서류</h2><button type="button">전체 보기</button></div>
    <div className="personal-recent__list">{items.map((item) => <div className="personal-recent__item" key={item.name}>
      <div><strong>{item.name}</strong><span>{item.meta}</span><em className={item.passed ? 'is-pass' : ''}>{item.state}</em></div>
      <ChevronRightIcon width={16} height={16} />
    </div>)}</div>
  </section>
}

export function C2CriteriaInput({ onNext }: { onNext: (response: ChecklistResponse, sourceText: string) => void }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isMaking, setIsMaking] = useState(false)

  const selectFile = (next?: File) => {
    if (!next) return
    if (!isAcceptedFile(next)) { setFileError('올릴 수 없는 형식이에요. ' + acceptedFormatsLabel + ' 파일을 올려 주세요.'); return }
    setFileError(''); setFile(next)
  }
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files[0]) }
  const pasteFromClipboard = async () => {
    try { const pasted = await navigator.clipboard.readText(); setText((current) => (current + pasted).slice(0, maxLength)) } catch { /* 권한이 없으면 직접 붙여넣기 */ }
  }
  const makeChecklist = async () => {
    if (!text.trim()) {
      setFileError('현재 AI API는 공고문 파일 자체를 받지 않습니다. 공고문 텍스트를 붙여 넣어 주세요.')
      return
    }
    setIsMaking(true); setFileError('')
    try {
      const response = await generateDocumentChecklist({ documentType: '지원사업 제출서류', officialInstructions: text.trim() })
      if (response.schema_version !== '2.0' || !Array.isArray(response.items)) throw new Error('AI 체크리스트 응답 형식을 확인할 수 없습니다.')
      onNext(response, text.trim())
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'AI 체크리스트 생성에 실패했습니다.')
    } finally { setIsMaking(false) }
  }
  const canMake = Boolean(text.trim() || file) && !isMaking

  return <main className="personal-main">
    <div className="personal-page-header"><h1>어떤 서류를 점검할까요?</h1><p>공고문이나 받은 양식을 넣으면, 그 기준에 맞춰 내 서류를 확인해드려요.</p></div>
    <div className="personal-body">
      <div className="personal-content">
        <div className="c2-inputs">
          <section className="personal-card c2-card c2-paste">
            <div className="c2-card__head"><span className="c2-icon-box"><ClipboardIcon /></span><div><h2>공고문·안내 메일 붙여넣기</h2><p>공고문, 안내 메일, 단톡방 공지를 그대로 붙여넣어 주세요</p></div></div>
            <div className="c2-textarea">
              <textarea aria-label="공고문 내용" maxLength={maxLength} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)} placeholder="예) 연구 활동비 정산 서류는 계획서, 계약서, 영수증 첨부철을 11월 5일까지 학과 사무실로 제출해주세요..." value={text} />
              <div className="c2-textarea__footer"><button className="c2-paste-chip" onClick={pasteFromClipboard} type="button"><ClipboardIcon />클립보드에서 붙여넣기</button><span>{text.length.toLocaleString()} / 5,000자</span></div>
            </div>
          </section>
          <section className="personal-card c2-card c2-upload">
            <div className="c2-card__head"><span className="c2-icon-box"><FileIcon /></span><div><h2>양식 파일 올리기</h2><p>받은 신청서 양식이나 안내 파일</p></div></div>
            <label className={`c2-dropzone ${isDragging ? 'is-dragging' : ''}`} onDragLeave={() => setIsDragging(false)} onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} onDrop={handleDrop}>
              <input accept={acceptedFormats} onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = '' }} type="file" />
              <span className="c2-dropzone__icon"><UploadIcon /></span>
              {file
                ? <span className="c2-dropzone__text"><strong className="c2-file-name">{file.name}</strong><span><b className="personal-format">{fileFormat(file)}</b> {formatSize(file.size)}</span></span>
                : <span className="c2-dropzone__text"><strong>여기에 파일을 끌어다 놓으세요</strong><span>{acceptedFormatsLabel}를 올릴 수 있어요</span></span>}
              <span className="c2-select-button">{file ? '다른 파일 선택' : '파일 선택'}</span>
            </label>
            {fileError && <p className="personal-error" role="alert">{fileError}</p>}
          </section>
        </div>
        <div className="personal-bottom-row">
          <span className="personal-hint"><InfoIcon />하나만 넣어도 돼요. 둘 다 넣으면 더 정확해요.</span>
          <Button disabled={!canMake} size="large" onClick={makeChecklist}><span className="personal-button-inner"><ListChecksIcon />{isMaking ? 'AI가 기준을 찾는 중…' : '체크리스트 만들기'}</span></Button>
        </div>
      </div>
      <aside className="personal-aside"><RecentCard items={recentChecks} /></aside>
    </div>
  </main>
}
