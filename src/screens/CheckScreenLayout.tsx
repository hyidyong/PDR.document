import { Button, FileIcon } from '../components/common'
import type { CheckScreenProps, CheckStatus, DocumentId } from './checkModel'
import { documentLabels } from './checkModel'
import { EmptyUpload, PreviewFile } from './CheckPreview'

const ids: DocumentId[] = ['plan', 'contract', 'receipts']
const resultText: Record<CheckStatus, string> = { pass: '통과', recommend: '보완 권고', unverifiable: '확인 불가' }
const designStatus: Record<CheckStatus, string> = { pass: '통과', recommend: '오류 1', unverifiable: '확인 필요 1' }

export function CheckScreenLayout({ activeId, documents, checkingId, current, passedCount, onTabChange, onReupload, onFileSelect, isResubmitting, editableIds = [], checkRound, checkTime }: CheckScreenProps) {
  const finding = [...(documents.contract?.findings ?? []), ...(documents.receipts?.findings ?? [])]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.number === item.number) === index)
  const isChecking = checkingId === activeId
  const uploadedAt = current?.checkedAt.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  const canEditActive = !isResubmitting || editableIds.includes(activeId)
  return <div className="check-content">
    <section className="check-preview-card">
      <div className="check-tabs">
        <div className="check-tabs__list" role="tablist" aria-label="제출 서류">
          {ids.map((id) => <button aria-selected={activeId === id} className={`check-tab ${activeId === id ? 'is-active' : ''}`} key={id} onClick={() => onTabChange(id)} role="tab" type="button">{documentLabels[id]}<span className={`check-tab__state ${documents[id]?.status ?? ''}`}>{checkingId === id ? '검사 중' : documents[id] ? designStatus[documents[id].status] : '미제출'}</span></button>)}
        </div>
        <div className="check-file-meta"><FileIcon width={16} height={16} />{current && <span className="check-file-format">PDF</span>}<span>{current ? `${current.file.name} · ${uploadedAt} 업로드` : `${documentLabels[activeId]} · 아직 업로드하지 않았어요`}</span></div>
      </div>
      {current ? <PreviewFile file={current.file} /> : canEditActive ? <EmptyUpload onFileSelect={(file) => onFileSelect(file, activeId)} /> : <div className="check-empty-upload">이 서류는 이번 보완 대상이 아니에요.</div>}
      <div className="check-preview-footer"><div className="check-legend">{activeId !== 'receipts' && <span><i className="check-legend__recommend" />오류</span>}<span><i className="check-legend__unverifiable" />확인 필요</span><small>번호는 오른쪽 결과 카드와 같아요</small></div><span className="check-pager">1 / 1</span></div>
    </section>
    <aside className="check-aside">
      <section className="check-progress-card"><div className="check-progress-card__head"><strong>제출 서류 3개 중 {passedCount}개 통과</strong><span>{passedCount}/3</span></div><div className="check-progress-card__track"><span style={{ width: `${(passedCount / 3) * 100}%` }} /></div><div className="check-progress-card__items">{ids.map((id) => <button className={activeId === id ? 'is-active' : ''} key={id} onClick={() => onTabChange(id)} type="button"><span className="check-progress-card__dot" /><span>{documentLabels[id]}</span><small>{checkingId === id ? '검사 중' : documents[id] ? designStatus[documents[id].status] : '미제출'}</small></button>)}</div></section>
      {isChecking && <section className="check-result-card" role="status"><h2>AI 검사 중</h2><p>업로드한 파일을 시연용 결과에 연결하고 있어요.</p></section>}
      {!isChecking && current && <><p className="check-mock-note">시연용 mock 검사 결과 · 실제 파일 내용은 분석하지 않았어요.</p>{finding.length ? finding.map((item) => <section className="check-result-card" key={item.number}><div className="check-result-card__head"><span className="check-result-card__number">{item.number}</span><span className="check-result-card__ai">✦ AI 검사</span>{item.number === 2 && <span className="check-result-card__compare">서류 간 비교</span>}<span className={`check-result-card__state ${item.status}`}>{item.status === 'pass' ? resultText[item.status] : designStatus[item.status]}</span></div><h2>{item.title}</h2><p className="check-result-card__location">{activeId === 'receipts' && item.number === 2 ? documents.receipts?.findings[0]?.location ?? item.location : item.location}</p><div className="check-result-card__advice">{item.advice}</div><Button disabled={isResubmitting && !editableIds.includes(item.number === 1 ? 'contract' : activeId)} variant="secondary" size="small" onClick={() => onReupload(item.number === 1 ? 'contract' : activeId)}>수정하기</Button></section>) : isResubmitting && passedCount === 3 ? <section className="check-result-card check-result-card--resubmit-pass"><span className="check-result-card__pass-icon">✓</span><h2>AI 확인 완료 · 재제출해도 좋아요</h2><p>점검 {checkRound}회차{checkTime && ` · ${checkTime}`}</p></section> : <section className="check-result-card check-result-card--pass"><div className="check-result-card__head"><span className="check-result-card__ai">✦ AI 검사</span><span className="check-result-card__state pass">통과</span></div><h2>확인된 보완 항목이 없어요</h2><p>제출 전 파일을 다시 확인해 주세요.</p></section>}</>}
    </aside>
  </div>
}
