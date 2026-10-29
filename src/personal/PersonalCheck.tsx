import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Button, FileIcon } from '../components/common'
import { UploadBox } from '../components/documents'
import '../screens/DocumentCheckFlow.css'
import { acceptedFormats, acceptedFormatsLabel, fileFormat, formatMonthDay, formatSize, isAcceptedFile, mockCheck } from './personalMock'
import type { Criteria, PersonalUpload } from './personalMock'

const previewableFormats = ['PDF', 'JPG', 'PNG']

function PersonalPreview({ file }: { file: File }) {
  const format = fileFormat(file)
  const canPreview = previewableFormats.includes(format)
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!canPreview) return
    const objectUrl = URL.createObjectURL(file)
    const timer = setTimeout(() => setUrl(objectUrl), 0)
    return () => { clearTimeout(timer); URL.revokeObjectURL(objectUrl) }
  }, [file, canPreview])
  if (!canPreview) return <div className="check-viewer personal-no-preview">
    <div className="personal-no-preview__file"><span className="file-icon-box"><FileIcon width={22} height={22} /></span><strong>{file.name}</strong><span className="check-file-format">{format}</span><small>이 형식은 미리보기를 지원하지 않아요</small></div>
  </div>
  return <div className="check-viewer"><aside className="check-thumbnail"><div className="check-thumbnail__page"><FileIcon width={26} height={26} /></div><span>1</span></aside><div className="check-viewer__stage">{url && (format === 'PDF' ? <iframe src={`${url}#toolbar=0`} title={`${file.name} 미리보기`} /> : <img alt={`${file.name} 미리보기`} className="personal-image-preview" src={url} />)}</div></div>
}

function stateLabel(upload: PersonalUpload | undefined, checking: boolean) {
  if (checking) return { text: '검사 중', className: '' }
  if (!upload) return { text: '미제출', className: '' }
  return upload.passed ? { text: '통과', className: 'pass' } : { text: '오류 1', className: 'recommend' }
}

export function PersonalCheck({ criteria, uploads, onUploadsChange, onBack, onComplete }: { criteria: Criteria; uploads: Array<PersonalUpload | undefined>; onUploadsChange: Dispatch<SetStateAction<Array<PersonalUpload | undefined>>>; onBack: () => void; onComplete: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [checkingIndexes, setCheckingIndexes] = useState<number[]>([])
  const [fileError, setFileError] = useState('')
  const reuploadInput = useRef<HTMLInputElement>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])

  const docs = criteria.docs
  const current = uploads[activeIndex]
  const passedCount = docs.filter((_, index) => uploads[index]?.passed).length
  const allPassed = passedCount === docs.length

  const selectFile = (file: File | undefined, index: number) => {
    if (!file) return
    if (!isAcceptedFile(file)) { setFileError(`올릴 수 없는 형식이에요. ${acceptedFormatsLabel} 파일을 올려 주세요.`); return }
    setFileError('')
    const attempt = (uploads[index]?.attempt ?? 0) + 1
    setCheckingIndexes((current) => [...current, index])
    timers.current.push(window.setTimeout(() => {
      onUploadsChange((previous) => { const next = [...previous]; next[index] = { file, checkedAt: new Date(), ...mockCheck(index, attempt, criteria) }; return next })
      setCheckingIndexes((current) => current.filter((item) => item !== index))
    }, 1200))
  }

  const isChecking = checkingIndexes.includes(activeIndex)
  const state = (index: number) => stateLabel(uploads[index], checkingIndexes.includes(index))

  return <main className="personal-main">
    <div className="personal-page-header"><h1>{criteria.title} 서류 점검</h1><p>서류를 올리면 앞에서 확인한 기준에 맞춰 AI가 점검해요.</p></div>
    <div className="personal-body personal-body--check">
      <div className="check-content">
        <section className="check-preview-card">
          <div className="check-tabs">
            <div className="check-tabs__list" role="tablist" aria-label="점검할 서류">
              {docs.map((doc, index) => <button aria-selected={activeIndex === index} className={`check-tab ${activeIndex === index ? 'is-active' : ''}`} key={index} onClick={() => setActiveIndex(index)} role="tab" type="button">{doc.name}<span className={`check-tab__state ${state(index).className}`}>{state(index).text}</span></button>)}
            </div>
            <div className="check-file-meta"><FileIcon width={16} height={16} />{current && <span className="check-file-format">{fileFormat(current.file)}</span>}<span>{current ? `${current.file.name} · ${formatMonthDay(current.checkedAt)} 업로드` : `${docs[activeIndex]?.name} · 아직 업로드하지 않았어요`}</span></div>
          </div>
          {current && !isChecking
            ? <PersonalPreview file={current.file} />
            : <div className="check-empty-upload"><UploadBox accept={acceptedFormats} formats="HWP · HWPX · DOCX · XLSX · PDF · JPG · PNG" onFileSelect={(file) => selectFile(file, activeIndex)}>{isChecking ? 'AI가 서류를 확인하고 있어요…' : `${docs[activeIndex]?.name} 파일을 올려주세요`}</UploadBox></div>}
          <div className="check-preview-footer"><div className="check-legend"><span><i className="check-legend__recommend" />오류</span><small>오른쪽 결과 카드에서 고칠 부분을 확인하세요</small></div>{current && <span className="check-pager">{formatSize(current.file.size)}</span>}</div>
        </section>

        <aside className="check-aside">
          <section className="check-progress-card">
            <div className="check-progress-card__head"><strong>서류 {docs.length}개 중 {passedCount}개 통과</strong><span>{passedCount}/{docs.length}</span></div>
            <div className="check-progress-card__track"><span style={{ width: `${(passedCount / docs.length) * 100}%` }} /></div>
            <div className="check-progress-card__items">{docs.map((doc, index) => <button className={activeIndex === index ? 'is-active' : ''} key={index} onClick={() => setActiveIndex(index)} type="button"><span className="check-progress-card__dot" /><span>{doc.name}</span><small>{state(index).text}</small></button>)}</div>
          </section>
          {isChecking && <section className="check-result-card" role="status"><h2>AI 검사 중</h2><p>올린 파일을 기준과 비교하고 있어요.</p></section>}
          {!isChecking && current && <>
            <p className="check-mock-note">시연용 mock 검사 결과 · 실제 파일 내용은 분석하지 않았어요.</p>
            {current.finding
              ? <section className="check-result-card">
                <div className="check-result-card__head"><span className="check-result-card__number">1</span><span className="check-result-card__ai">✦ AI 검사</span><span className="check-result-card__state recommend">오류 1</span></div>
                <h2>{current.finding.title}</h2>
                <p className="check-result-card__location">{current.finding.location}</p>
                <div className="check-result-card__advice">{current.finding.advice}</div>
                <Button variant="secondary" size="small" onClick={() => reuploadInput.current?.click()}>다시 올리기</Button>
              </section>
              : <section className="check-result-card check-result-card--pass">
                <div className="check-result-card__head"><span className="check-result-card__ai">✦ AI 검사</span><span className="check-result-card__state pass">통과</span></div>
                <h2>{current.attempt > 1 ? '고친 부분까지 모두 확인했어요' : '기준에 맞지 않는 부분이 없어요'}</h2>
                <p>점검 {current.attempt}회차 · {current.checkedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                <Button variant="secondary" size="small" onClick={() => reuploadInput.current?.click()}>다른 파일로 바꾸기</Button>
              </section>}
          </>}
          <input accept={acceptedFormats} className="check-hidden-input" onChange={(event) => { selectFile(event.target.files?.[0], activeIndex); event.target.value = '' }} ref={reuploadInput} tabIndex={-1} type="file" />
        </aside>
      </div>
      {fileError && <p className="personal-error" role="alert">{fileError}</p>}
      <div className="personal-bottom-row">
        <Button variant="secondary" size="large" onClick={onBack}>기준 다시 보기</Button>
        <div className="personal-bottom-row__end">
          <span className="personal-hint">{allPassed ? '모든 서류가 통과했어요' : `${docs.length - passedCount}개 서류가 남았어요`}</span>
          <Button disabled={!allPassed || checkingIndexes.length > 0} size="large" onClick={onComplete}>점검 완료</Button>
        </div>
      </div>
    </div>
  </main>
}
