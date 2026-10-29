import { useEffect, useRef, useState } from 'react'
import { downloadDocumentsZip } from '../api/adminApi'
import type { AdminProject } from '../api/adminApi'
import { Button, FileIcon } from '../components/common'
import { ArchiveIcon, CloseIcon, DownloadIcon, EllipsisIcon, FolderIcon, InfoIcon } from './adminIcons'
import { adminDocuments } from './mockAdminData'
import type { AdminApplicant } from './mockAdminData'

type Scope = 'approved' | 'selected'

// Rough size of one applicant's 서류 3개, for the "약 NMB" hint.
const MB_PER_APPLICANT = 4

// D8 ZIP 다운로드. applicants come in the D5 order; selected is the D5 체크박스 선택.
export function D8DownloadModal({ project, applicants, selected, onClose }: { project: AdminProject; applicants: AdminApplicant[]; selected: Set<string>; onClose: () => void }) {
  const approved = applicants.filter((applicant) => applicant.status === 'APPROVED')
  const chosen = applicants.filter((applicant) => selected.has(applicant.applicantId))
  const [scope, setScope] = useState<Scope>(chosen.length > 0 ? 'selected' : 'approved')
  const [downloading, setDownloading] = useState(false)
  const [notice, setNotice] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', handleKeyDown)
    return () => { window.removeEventListener('keydown', handleKeyDown); previousActiveElement?.focus() }
  }, [])

  const targets = scope === 'approved' ? approved : chosen
  // 미제출 applicants have no files, so they get no folder.
  const folders = targets.filter((applicant) => applicant.lastSubmittedAt)
  const skipped = targets.length - folders.length
  const fileNames = adminDocuments.map((document) => `${document.replace(/ /g, '')}.pdf`)

  const choose = (next: Scope) => { setScope(next); setNotice(false) }
  const download = async () => {
    setDownloading(true)
    try {
      const { downloaded } = await downloadDocumentsZip(folders.map((applicant) => applicant.applicantId))
      if (downloaded) onClose()
      else setNotice(true)
    } catch (error) {
      console.error(error)
    } finally {
      setDownloading(false)
    }
  }

  const options: { scope: Scope; label: string; count: number; sub: string }[] = [
    { scope: 'approved', label: '승인된 서류만', count: approved.length, sub: `${approved.length}명 · 승인 상태인 신청자` },
    { scope: 'selected', label: '선택한 신청자 전체', count: chosen.length, sub: chosen.length ? `${chosen.length}명 · 상태와 관계없이 지금 선택한 신청자` : '대시보드에서 신청자를 먼저 선택해주세요' },
  ]

  return <div className="check-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} role="presentation">
    <div aria-describedby="admin-zip-description" aria-labelledby="admin-zip-title" aria-modal="true" className="admin-zip" ref={dialogRef} role="dialog">
      <div className="admin-zip__head">
        <div><h2 id="admin-zip-title">서류 일괄 다운로드</h2><p id="admin-zip-description">신청자별 폴더로 묶어 ZIP 파일 하나로 받아요.</p></div>
        <button aria-label="닫기" className="admin-zip__close" onClick={onClose} type="button"><CloseIcon width={20} height={20} /></button>
      </div>

      <div className="admin-zip__options" role="radiogroup" aria-label="받을 서류">
        {options.map((option) => <label className={`admin-zip__option ${scope === option.scope ? 'is-active' : ''} ${option.count === 0 ? 'is-disabled' : ''}`} key={option.scope}>
          <input checked={scope === option.scope} disabled={option.count === 0} name="admin-zip-scope" onChange={() => choose(option.scope)} type="radio" />
          <span className="admin-zip__radio" aria-hidden="true" />
          <span className="admin-zip__option-text">
            <span className="admin-zip__option-label">{option.label}<span>({option.count}명)</span></span>
            <small>{option.sub}</small>
          </span>
        </label>)}
      </div>

      <div className="admin-zip__preview">
        <div className="admin-zip__preview-head">
          <strong>폴더 구조 미리보기</strong>
          <span>{folders.length}명 · 파일 {folders.length * fileNames.length}개 · 약 {folders.length * MB_PER_APPLICANT}MB</span>
        </div>
        <ul className="admin-zip__tree">
          <li className="admin-zip__node admin-zip__node--zip"><ArchiveIcon width={14} height={14} />{project.zipFileName}</li>
          {folders.length === 0 && <li className="admin-zip__node admin-zip__node--muted admin-zip__node--folder">받을 서류가 없어요</li>}
          {folders.slice(0, 2).map((applicant, i) => <li key={applicant.applicantId}>
            <div className="admin-zip__node admin-zip__node--folder"><FolderIcon width={14} height={14} />{applicant.applicantId}_{applicant.name}/</div>
            {i === 0 && <ul>{fileNames.map((name) => <li className="admin-zip__node admin-zip__node--file" key={name}><FileIcon width={14} height={14} />{name}</li>)}</ul>}
          </li>)}
          {folders.length > 2 && <li className="admin-zip__node admin-zip__node--folder admin-zip__node--muted"><EllipsisIcon width={14} height={14} />외 {folders.length - 2}명 폴더</li>}
        </ul>
        {skipped > 0 && <p className="admin-zip__hint">미제출 {skipped}명은 받을 서류가 없어 빠져요.</p>}
      </div>

      {notice && <p className="admin-notice admin-zip__notice" role="status"><InfoIcon width={13} height={13} />데모에서는 다운로드되지 않아요. 실제 서비스에서는 {project.zipFileName} 파일을 받아요.</p>}

      <div className="admin-zip__actions">
        <Button onClick={onClose} variant="secondary">취소</Button>
        <Button disabled={folders.length === 0 || downloading} onClick={download}>ZIP 다운로드<DownloadIcon width={16} height={16} /></Button>
      </div>
    </div>
  </div>
}
