import { AppHeader, Button, CheckIcon, FileIcon, PencilIcon, SparklesIcon, UploadIcon } from '../components/common'
import type { MainPage } from '../components/common'
import './UsageGuide.css'

function IdentityIcon() { return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" /><path d="M5 20c.4-3.7 2.7-5.5 7-5.5s6.6 1.8 7 5.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg> }
function InboxIcon() { return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4 5h16v14H4V5Zm0 9h5l1.5 2h3l1.5-2h5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /></svg> }

const steps = [
  { number: '01', title: '본인 확인', description: '이름과 학번 또는 식별번호를 입력해 본인 확인을 진행해요. 현재 시연에서는 등록된 mock 정보로 확인해요.', icon: <IdentityIcon /> },
  { number: '02', title: '서류 업로드', description: '사업계획서, 물품매매계약서, 영수증 첨부철 등 필수 서류 3종을 올려요.', icon: <UploadIcon /> },
  { number: '03', title: 'AI 서류 검사', description: '업로드 후 표시되는 검사 결과에서 누락되거나 수정이 필요한 내용을 확인해요.', icon: <SparklesIcon /> },
  { number: '04', title: '최종 제출', description: '검사 결과와 파일을 확인한 다음 최종 제출을 선택해 담당자 검토 단계로 보내요. 업로드만으로 제출되지는 않아요.', icon: <CheckIcon /> },
  { number: '05', title: '제출 상태 확인', description: '내 제출함에서 제출 상태, 검사 기록과 담당자 검토 진행 상황을 확인해요.', icon: <InboxIcon /> },
  { number: '06', title: '보완 및 재제출', description: '보완 요청이 오면 대상 서류만 교체하고 다시 검사해요. 최종 재제출을 확정해야 검토 대기로 바뀌어요.', icon: <PencilIcon /> },
]

export function UsageGuide({ onNavigate, onLogout }: { onNavigate: (page: MainPage) => void; onLogout: () => void }) {
  return <div className="usage-guide">
    <AppHeader activePage="guide" onNavigate={onNavigate} onLogout={onLogout} />
    <main className="usage-guide__main">
      <div className="usage-guide__breadcrumb">MODIT <span>›</span> 이용 가이드</div>
      <div className="usage-guide__heading"><span>처음부터 재제출까지</span><h1>MODIT 이용 가이드</h1><p>서류를 준비하고 제출하는 과정을 순서대로 안내해 드려요.</p></div>
      <div className="usage-guide__steps">{steps.map((step) => <article className="usage-guide__step" key={step.number}>
        <div className="usage-guide__step-top"><span className="usage-guide__icon">{step.icon}</span><span className="usage-guide__number">STEP {step.number}</span></div>
        <h2>{step.title}</h2><p>{step.description}</p>
      </article>)}</div>
      <div className="usage-guide__notes"><p><FileIcon height={18} width={18} /> 파일 업로드와 최종 제출은 별도 단계예요. 제출 전 마지막 확인을 꼭 완료해 주세요.</p><p><SparklesIcon height={18} width={18} /> AI 검사는 서류 검토를 돕는 시연용 기능이며, 최종 승인 여부는 담당자가 결정해요.</p></div>
      <div className="usage-guide__action"><Button onClick={() => onNavigate('check')} size="large">서류 점검 시작하기</Button></div>
    </main>
  </div>
}
