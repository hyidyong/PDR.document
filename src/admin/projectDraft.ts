// 새 프로젝트 만들기 (D2~D4 마법사): the values being entered, kept in AdminApp so [이전]/[다음] and 뒤로가기 keep them.
import type { CreatedProject, NewProjectInput } from '../api/adminApi'
import { defaultNewDocuments, rosterCsvHeader } from './mockAdminData'
import type { RosterRow } from './mockAdminData'

export type WizardStep = 1 | 2 | 3 | 4
export type DraftDocument = { key: string; name: string; required: boolean; formFile: { name: string; size: number } | null; note: string }
export type RosterEntry = RosterRow & { problem: string | null }
export type RosterSource = { kind: 'csv'; fileName: string; size: number } | { kind: 'previous'; label: string }
export type ProjectDraft = {
  name: string
  org: string
  deadlineDate: string
  deadlineTime: string
  slug: string
  // Once edited by hand, the slug stops following the project name.
  slugEdited: boolean
  rosterMode: 'list' | 'link'
  roster: RosterEntry[]
  rosterSource: RosterSource | null
  guide: string
  documents: DraftDocument[]
  created: CreatedProject | null
}

export const LINK_HOST = 'modit.kr/p/'
export const GUIDE_MAX = 5000
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SLUG_MAX = 40

let nextKey = 0
export const newDocument = (name = ''): DraftDocument => ({ key: `doc-${nextKey++}`, name, required: true, formFile: null, note: '' })

export function emptyDraft(): ProjectDraft {
  return { name: '', org: '', deadlineDate: '', deadlineTime: '18:00', slug: '', slugEdited: false, rosterMode: 'list', roster: [], rosterSource: null, guide: '', documents: defaultNewDocuments.map((name) => newDocument(name)), created: null }
}

/** English words and numbers in the name become the slug ("2026 Startup 정산" → "2026-startup"); otherwise project-<year>. */
export function suggestSlug(name: string) {
  const words = name.toLowerCase().match(/[a-z0-9]+/g) ?? []
  const slug = words.join('-').slice(0, SLUG_MAX).replace(/-+$/, '')
  return slug && /[a-z]/.test(slug) ? slug : `project-${slug || new Date().getFullYear()}`
}

export function slugError(slug: string) {
  if (!slug) return '링크 주소를 입력해 주세요'
  if (slug.length > SLUG_MAX) return `${SLUG_MAX}자 이하로 입력해 주세요`
  if (!SLUG_PATTERN.test(slug)) return '영문 소문자, 숫자, 하이픈(-)만 쓸 수 있어요'
  return null
}

/** "2026-10-31" + "18:00" → ISO with the Korea time zone. */
export const deadlineIso = (draft: ProjectDraft) => `${draft.deadlineDate}T${draft.deadlineTime || '18:00'}:00+09:00`

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Marks rows that cannot be registered: 이름 없음, 이메일 형식 오류, 학번 중복 (the later row). */
export function checkRoster(rows: RosterRow[]): RosterEntry[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    let problem: string | null = null
    if (!row.name) problem = '이름 없음'
    else if (!row.studentId) problem = '학번 없음'
    else if (seen.has(row.studentId)) problem = '학번 중복'
    else if (!EMAIL.test(row.email)) problem = '이메일 형식 오류'
    if (row.studentId) seen.add(row.studentId)
    return { ...row, problem }
  })
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { cell += '"'; i++ }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') { cells.push(cell.trim()); cell = '' }
    else cell += char
  }
  cells.push(cell.trim())
  return cells
}

/** Reads 대상자 ID, 이름, 학번, 이메일 columns (by header name, or in that order when there is no header). */
export function parseRosterCsv(text: string): RosterRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return []
  const first = splitCsvLine(lines[0])
  const hasHeader = first.some((cell) => (rosterCsvHeader as readonly string[]).includes(cell))
  const column = (label: string, fallback: number) => { const index = hasHeader ? first.indexOf(label) : -1; return index >= 0 ? index : fallback }
  const [idAt, nameAt, studentAt, emailAt] = rosterCsvHeader.map((label, index) => column(label, index))
  return (hasHeader ? lines.slice(1) : lines).map((line, index) => {
    const cells = splitCsvLine(line)
    return { id: cells[idAt] || `A${String(index + 1).padStart(3, '0')}`, name: cells[nameAt] ?? '', studentId: cells[studentAt] ?? '', email: cells[emailAt] ?? '' }
  })
}

/** Excel in Korea often saves CSV as EUC-KR; try UTF-8 first. */
export async function readCsvFile(file: File) {
  const buffer = await file.arrayBuffer()
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer) }
  catch { return new TextDecoder('euc-kr').decode(buffer) }
}

export function rosterCsv(rows: RosterRow[]) {
  const escape = (value: string) => (/[",]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  return `\uFEFF${[rosterCsvHeader.join(','), ...rows.map((row) => [row.id, row.name, row.studentId, row.email].map(escape).join(','))].join('\r\n')}\r\n`
}

/**
 * "AI가 이해한 기준 미리보기" for the demo: picks the 제출 서류, 기간, 마감 lines and the "-" rules out of the pasted 공고문.
 * Not real AI; the screen says so.
 */
export function previewCriteria(guide: string) {
  const items: string[] = []
  for (const raw of guide.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (/^[-·•*]\s*/.test(line)) items.push(line.replace(/^[-·•*]\s*/, ''))
    else if (/제출\s*서류|기간|마감/.test(line) && line.includes(':')) items.push(line)
  }
  return items
}

export const validRoster = (draft: ProjectDraft) => draft.roster.filter((row) => !row.problem)

export function toProjectInput(draft: ProjectDraft): NewProjectInput {
  return {
    name: draft.name.trim(),
    org: draft.org.trim(),
    deadlineAt: deadlineIso(draft),
    slug: draft.slug,
    rosterMode: draft.rosterMode,
    rosterCount: draft.rosterMode === 'list' ? validRoster(draft).length : 0,
    roster: draft.rosterMode === 'list' ? validRoster(draft).map(({ id, name, studentId, email }) => ({ id, name, studentId, email })) : [],
    guide: draft.guide,
    documents: draft.documents.filter((doc) => doc.name.trim()).map((doc) => ({ name: doc.name.trim(), required: doc.required, formFileName: doc.formFile?.name ?? null, note: doc.note.trim() })),
  }
}

export const formatBytes = (size: number) => (size < 1024 ? `${size}B` : size < 1024 * 1024 ? `${Math.round(size / 1024)}KB` : `${(size / 1024 / 1024).toFixed(1)}MB`)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
/** "10.31 (토) 18:00" */
export function formatDeadlineShort(iso: string) {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} (${WEEKDAYS[date.getDay()]}) ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
