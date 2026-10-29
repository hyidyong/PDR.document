import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { CheckIcon, ChevronDownIcon, FileIcon, UploadIcon } from '../components/common'
import { CloseIcon, DownloadIcon, FolderIcon, InfoIcon, LinkIcon, UsersIcon } from './adminIcons'
import { exampleRoster, previousRosters, rosterTemplateFileName } from './mockAdminData'
import { checkRoster, formatBytes, parseRosterCsv, readCsvFile, rosterCsv } from './projectDraft'
import type { ProjectDraft } from './projectDraft'

const PREVIEW_ROWS = 10

function Choice({ checked, icon, title, description, onSelect }: { checked: boolean; icon: ReactNode; title: string; description: string; onSelect: () => void }) {
  return <label className={`wz-choice ${checked ? 'is-selected' : ''}`}>
    <input checked={checked} name="wz-roster-mode" onChange={onSelect} type="radio" />
    <span aria-hidden="true" className="wz-radio" />
    <span className="wz-icon-box">{icon}</span>
    <span className="wz-choice__text"><strong>{title}</strong><span>{description}</span></span>
  </label>
}

// 양식 CSV: the design's 32-row 명단 (30 usable, 2 to fix), so the upload can be shown right away.
function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([rosterCsv(exampleRoster)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = rosterTemplateFileName
  link.click()
  URL.revokeObjectURL(url)
}

// D2 신청자 명단: CSV 업로드 (read in the browser) or 이전 프로젝트 명단, then a preview with the rows to fix.
export function D2Roster({ draft, onChange }: { draft: ProjectDraft; onChange: (draft: ProjectDraft) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [showAll, setShowAll] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const source = draft.rosterSource
  const problems = draft.roster.filter((row) => row.problem).length
  const rows = showAll ? draft.roster : draft.roster.slice(0, PREVIEW_ROWS)

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadError('')
    const parsed = parseRosterCsv(await readCsvFile(file))
    if (!parsed.length) { setUploadError('CSV에서 명단을 찾지 못했어요. 대상자 ID, 이름, 학번, 이메일 열이 있는지 확인해 주세요.'); return }
    setShowAll(false)
    onChange({ ...draft, roster: checkRoster(parsed), rosterSource: { kind: 'csv', fileName: file.name, size: file.size } })
  }
  const loadPrevious = (label: string) => {
    const previous = previousRosters.find((item) => item.label === label)
    if (!previous) return
    setShowAll(false)
    onChange({ ...draft, roster: checkRoster(previous.rows), rosterSource: { kind: 'previous', label } })
  }
  const clear = () => onChange({ ...draft, roster: [], rosterSource: null })

  return <>
    <div className="wz-choices">
      <Choice checked={draft.rosterMode === 'list'} description="CSV 업로드 또는 이전 프로젝트 명단 불러오기" icon={<UsersIcon width={20} height={20} />} onSelect={() => onChange({ ...draft, rosterMode: 'list' })} title="기존 명단 사용" />
      <Choice checked={draft.rosterMode === 'link'} description="링크로 신청한 사람이 자동으로 명단에 추가돼요" icon={<LinkIcon width={20} height={20} />} onSelect={() => onChange({ ...draft, rosterMode: 'link' })} title="새로 받기" />
    </div>

    {draft.rosterMode === 'link'
      ? <section className="wz-card wz-card--note"><InfoIcon width={16} height={16} />명단 없이 시작해요. 4단계 링크로 들어와 로그인한 사람이 신청자 명단에 추가돼요.</section>
      : <>
        <section className="wz-card wz-upload">
          <div className="wz-upload__head">
            <span className="wz-icon-box wz-icon-box--large"><UploadIcon width={20} height={20} /></span>
            <span className="wz-upload__text"><strong>명단 CSV 업로드</strong><span>대상자 ID, 이름, 학번, 이메일 열이 있어야 해요</span></span>
            <button className="wz-link-button" onClick={downloadTemplate} type="button"><DownloadIcon width={16} height={16} />양식 CSV 받기</button>
          </div>
          <input accept=".csv,text/csv" className="wz-hidden-input" onChange={(event) => void upload(event)} ref={fileInput} type="file" />
          {source?.kind === 'csv'
            ? <div className="wz-file">
              <span className="wz-file__icon"><FileIcon width={20} height={20} /></span>
              <span className="wz-file__text"><strong>{source.fileName} · {draft.roster.length}행</strong><span>{formatBytes(source.size)} · 방금 업로드</span></span>
              <span className="wz-format">CSV</span>
              <span className="wz-file__status"><CheckIcon width={16} height={16} />업로드 완료</span>
              <button aria-label="업로드한 명단 지우기" className="wz-icon-button" onClick={clear} type="button"><CloseIcon width={16} height={16} /></button>
            </div>
            : <button className="wz-dropzone" onClick={() => fileInput.current?.click()} type="button"><UploadIcon width={18} height={18} />CSV 파일 선택</button>}
          {uploadError && <p className="wz-field-error" role="alert">{uploadError}</p>}
          <div className="wz-or"><span>또는</span></div>
          <div className="wz-previous">
            <span className="wz-upload__text"><strong>이전 프로젝트 명단 불러오기</strong><span>지난 프로젝트에서 쓴 명단을 그대로 가져와요</span></span>
            <label className="wz-select">
              <FolderIcon width={16} height={16} />
              <select aria-label="이전 프로젝트 선택" onChange={(event) => loadPrevious(event.target.value)} value={source?.kind === 'previous' ? source.label : ''}>
                <option disabled value="">이전 프로젝트 선택</option>
                {previousRosters.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
              </select>
              <ChevronDownIcon width={16} height={16} />
            </label>
          </div>
        </section>

        {draft.roster.length > 0 && <section className="wz-card wz-preview">
          <div className="wz-preview__head">
            <span className="wz-preview__summary"><CheckIcon width={20} height={20} /><strong>{draft.roster.length - problems}명 등록 가능</strong>{problems > 0 && <><span className="wz-sep">·</span><strong className="is-error">{problems}행 확인 필요</strong></>}</span>
            <span className="wz-muted">미리보기 · {draft.roster.length}행 중 {rows.length}행</span>
          </div>
          <table className="d1-table wz-roster-table">
            <colgroup><col className="wz-col-id" /><col className="wz-col-name" /><col className="wz-col-student" /><col /><col className="wz-col-status" /></colgroup>
            <thead><tr><th>대상자 ID</th><th>이름</th><th>학번</th><th>이메일</th><th>상태</th></tr></thead>
            <tbody>
              {rows.map((row, index) => <tr className={row.problem ? 'is-problem' : ''} key={`${row.id}-${index}`}>
                <td className="admin-muted">{row.id}</td>
                <td><strong>{row.name || '—'}</strong></td>
                <td className="admin-muted">{row.studentId || '—'}</td>
                <td className="admin-muted">{row.email || '—'}</td>
                <td>{row.problem ? <span className="wz-row-status is-error"><InfoIcon width={16} height={16} />{row.problem}</span> : <span className="wz-row-status"><CheckIcon width={16} height={16} />정상</span>}</td>
              </tr>)}
            </tbody>
          </table>
          {draft.roster.length > PREVIEW_ROWS && <button className="wz-more" onClick={() => setShowAll(!showAll)} type="button">{showAll ? '접기' : `나머지 ${draft.roster.length - PREVIEW_ROWS}행 보기`}<ChevronDownIcon className={showAll ? 'is-flipped' : ''} width={16} height={16} /></button>}
        </section>}
      </>}
  </>
}
