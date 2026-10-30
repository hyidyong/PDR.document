import { AppHeader, Button, FileIcon, StatusBadge } from '../components/common'
import type { MainPage } from '../components/common'
import { documentLabels } from './checkModel'
import type { DocumentId, FlowOverview } from './checkModel'
import { mockProject } from './mockProject'
import './ModitHome.css'
import { formatDeadlineDate, formatDeadlineStatus } from '../utils/projectDeadline'

const documentIds: DocumentId[] = ['plan', 'contract', 'receipts']

function documentStatus(id: DocumentId, overview: FlowOverview) {
  if (overview.checkingId === id) return { label: 'AI 검사 중', kind: 'checking' }
  const document = overview.documents[id]
  if (!document) return { label: '미업로드', kind: 'pending' }
  if (document.status === 'pass') return { label: '통과', kind: 'pass' }
  if (document.status === 'recommend') return { label: '오류', kind: 'error' }
  return { label: '확인 필요', kind: 'review' }
}

function submissionStatus(overview: FlowOverview) {
  if (overview.isResubmitting) return { label: '보완 진행 중', badge: 'needs-review' as const }
  if (overview.reviewRequestedAt && !overview.resubmittedAt) return { label: '보완 필요', badge: 'needs-review' as const }
  if (overview.resubmittedAt) return { label: '담당자 검토 대기', badge: 'checking' as const }
  if (overview.submissionStatus === 'submitted') return { label: '제출 완료 · 담당자 확인 대기', badge: 'submitted' as const }
  if (overview.submissionStatus === 'incomplete') return { label: '제출(미비) · 담당자 확인 대기', badge: 'incomplete' as const }
  return { label: '최종 제출 전', badge: 'not-submitted' as const }
}

export function ModitHome({ deadlineAt, overview, onNavigate, onPersonalCheck, onLogout }: { deadlineAt?: string | null; overview: FlowOverview; onNavigate: (page: MainPage) => void; onPersonalCheck: () => void; onLogout: () => void }) {
  const uploadedCount = documentIds.filter((id) => overview.documents[id]).length
  const passedCount = documentIds.filter((id) => overview.documents[id]?.status === 'pass').length
  const status = submissionStatus(overview)

  return <div className="modit-home">
    <AppHeader activePage="home" onNavigate={onNavigate} onLogout={onLogout} />
    <main className="modit-home__main">
      <div className="modit-home__breadcrumb">{mockProject.organization} <span>›</span> 홈</div>
      <section className="modit-home__intro">
        <span className="modit-home__eyebrow">MODIT · 서류 제출 도우미</span>
        <h1>서류 준비부터 제출 현황까지<br />한곳에서 확인하세요</h1>
        <p>필수 서류를 올리고 AI 점검 결과를 살펴본 뒤 최종 제출할 수 있어요. 담당자 검토 진행 상황은 내 제출함에서 확인하세요.</p>
        <div className="modit-home__actions"><Button onClick={() => onNavigate('check')} size="large">서류 점검하기</Button><Button onClick={onPersonalCheck} size="large" variant="secondary">AI 체크리스트 생성</Button><Button onClick={() => onNavigate('inbox')} size="large" variant="secondary">내 제출함 확인하기</Button></div>
      </section>

      <section aria-labelledby="home-project-title" className="modit-home__project">
        <div><span className="modit-home__section-label">참여 중인 프로젝트</span><h2 id="home-project-title">{mockProject.name}</h2><p>{mockProject.organization}</p></div>
        <div className="modit-home__deadline"><span>서류 제출 마감</span><strong>{formatDeadlineDate(deadlineAt)}까지</strong><small>{formatDeadlineStatus(deadlineAt)}</small></div>
      </section>

      <section aria-labelledby="home-progress-title" className="modit-home__progress">
        <div className="modit-home__section-head"><div><span className="modit-home__section-label">제출 준비 현황</span><h2 id="home-progress-title">필수 서류 3종</h2></div><StatusBadge label={status.label} status={status.badge} /></div>
        <p className="modit-home__count">{uploadedCount}개 업로드 · {passedCount}개 AI 점검 통과</p>
        <div className="modit-home__documents">{documentIds.map((id) => {
          const document = overview.documents[id]
          const current = documentStatus(id, overview)
          return <article className="modit-home__document" key={id}>
            <span aria-hidden="true" className="modit-home__file-icon"><FileIcon height={22} width={22} /></span>
            <div><h3>{documentLabels[id]}</h3><p>{document?.file.name ?? '아직 업로드하지 않았어요'}</p></div>
            <span className={`modit-home__document-status is-${current.kind}`}>{current.label}</span>
          </article>
        })}</div>
        <p className="modit-home__note">AI 점검은 서류 검토를 돕는 시연용 기능이에요. 최종 승인 여부는 담당자가 결정해요.</p>
      </section>
    </main>
  </div>
}
