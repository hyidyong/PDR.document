export type RequiredDoc = {
  name: string; note: string; requirement?: string; issuer?: string | null; howToObtain?: string | null;
  estimatedTime?: string | null; deadline?: string | null; filenameRule?: string | null; sourceUrl?: string | null;
  sourceType?: string; verification?: string; evidence?: string
}
export type RuleGroupId = 'writing' | 'file' | 'submit'
export type RuleItem = { text: string; example?: string }
export type Criteria = {
  title: string; term: string; docs: RequiredDoc[]; rules: Record<RuleGroupId, RuleItem[]>;
  webSearchUsed?: boolean; sourceVerification?: string; disclaimer?: string; questions?: string[]; fromApi?: boolean
}

export type PersonalFinding = { title: string; location: string; advice: string }
export type PersonalUpload = { file: File; attempt: number; passed: boolean; finding?: PersonalFinding; checkedAt: Date }

export const ruleGroupLabels: Record<RuleGroupId, string> = { writing: '작성 기준', file: '파일 규칙', submit: '제출 방법·마감' }

export const mockCriteria: Criteria = {
  title: '교내 연구 활동비 정산',
  term: '2026학년도 2학기',
  docs: [
    { name: '활동 계획서', note: '학과 양식' },
    { name: '물품매매계약서', note: '양측 서명·날인' },
    { name: '영수증 첨부철', note: '활동 기간 내 발행분' },
  ],
  rules: {
    writing: [{ text: '계약서 양측 서명·날인' }, { text: '영수증은 활동 기간 내 발행' }],
    file: [{ text: 'PDF' }, { text: '학번_이름_서류명', example: '예) 20231234_김청년_\n영수증첨부철.pdf' }],
    submit: [{ text: '11월 5일까지' }, { text: '학과 사무실 방문 제출' }, { text: '원본 제출' }],
  },
}

export const mockDeadline = new Date(2026, 10, 5)

export const sourceExcerpt = {
  title: '2026학년도 2학기\n교내 연구 활동비 정산 안내',
  highlights: [
    { id: 'docs', text: '제출 서류: 활동 계획서,\n물품매매계약서, 영수증 첨부철' },
    { id: 'writing', text: '계약서에는 매도인·매수인 양측의\n서명과 날인이 모두 있어야 하며,\n영수증은 활동 기간 내 발행분만\n인정합니다.' },
    { id: 'file', text: "파일은 PDF로, 파일명은\n'학번_이름_서류명'으로 해 주세요." },
    { id: 'submit', text: '11월 5일까지 학과 사무실을\n방문해 원본을 제출해 주세요.' },
  ],
}

export const recentChecks = [
  { name: '창업동아리 지원사업 정산', meta: '10월 28일 · 서류 3개', state: '확인 필요 1' },
  { name: '교내 연구 활동비 정산', meta: '10월 27일 · 서류 3개', state: '점검 중 2/3' },
]

export const doneRecentChecks = [
  { name: '교내 연구 활동비 정산', meta: '방금 · 서류 3개', state: '모두 통과', passed: true },
  { name: '창업동아리 지원사업 정산', meta: '10월 28일 · 서류 3개', state: '확인 필요 1', passed: false },
  { name: '지역 청년 일경험 사업', meta: '10월 26일 · 서류 3개', state: '모두 통과', passed: true },
]

export const acceptedFormats = '.hwp,.hwpx,.docx,.xlsx,.pdf,.jpg,.jpeg,.png'
export const acceptedFormatsLabel = '한글(HWP·HWPX), 워드(DOCX), 엑셀(XLSX), PDF, 이미지(JPG·PNG)'

export function fileFormat(file: File) {
  const extension = file.name.split('.').pop()?.toUpperCase() ?? ''
  return extension === 'JPEG' ? 'JPG' : extension
}

export function isAcceptedFile(file: File) {
  return ['HWP', 'HWPX', 'DOCX', 'XLSX', 'PDF', 'JPG', 'PNG'].includes(fileFormat(file))
}

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export function formatMonthDay(date: Date) {
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

// 시연용 가짜 AI: 두 번째 서류(계약서)는 처음 올리면 오류 1개, 다시 올리면 통과
export function mockCheck(docIndex: number, attempt: number, criteria: Criteria): Omit<PersonalUpload, 'file' | 'checkedAt'> {
  if (docIndex === 1 && attempt === 1) {
    return {
      attempt, passed: false,
      finding: {
        title: '매수인 서명·날인이 빠져 있어요',
        location: `${criteria.docs[1]?.name ?? '계약서'} · 1쪽 하단 서명란`,
        advice: `매도인 서명은 있지만 매수인 서명과 날인이 비어 있어요. 기준 "${criteria.rules.writing[0]?.text ?? '계약서 양측 서명·날인'}"에 맞게 서명·날인을 받은 뒤 다시 올려 주세요.`,
      },
    }
  }
  return { attempt, passed: true }
}
