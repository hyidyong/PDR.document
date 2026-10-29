import { useEffect, useState } from 'react'
import { Button, FileIcon } from '../components/common'
import type { CheckScreenProps, CheckStatus } from './checkModel'
import { documentIds as ids, documentLabels, documentStatusLabel } from './checkModel'
import { EmptyUpload, PreviewFile } from './CheckPreview'

const resultText: Record<CheckStatus, string> = { pass: '통과', recommend: '보완 권고', unverifiable: '확인 불가' }

export function CheckScreenLayout({ activeId, documents, checkingId, current, passedCount, onTabChange, onReupload, onFileSelect, isResubmitting, editableIds = [], checkRound, checkTime }: CheckScreenProps) {
  const finding = current?.findings ?? []
  const [previewPage, setPreviewPage] = useState(1)
  useEffect(() => setPreviewPage(1), [current?.file])
  const isChecking = checkingId === activeId
  const uploadedAt = current?.checkedAt.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  const canEditActive = !isResubmitting || editableIds.includes(activeId)
  return <div className="check-content">
    <section className="check-preview-card">
      <div className="check-tabs">
        <div className="check-tabs__list" role="tablist" aria-label="제출 서류">
          {ids.map((id) => <button aria-selected={activeId === id} className={`check-tab ${activeId === id ? 'is-active' : ''}`} key={id} onClick={() => onTabChange(id)} role="tab" type="button">{documentLabels[id]}<span className={`check-tab__state ${documents[id]?.status ?? ''}`}>{checkingId === id ? '검사 중' : documentStatusLabel(documents[id])}</span></button>)}
        </div>
        <div className="check-file-meta"><FileIcon width={16} height={16} />{current && <span className="check-file-format">PDF</span>}<span>{current ? `${current.file.name} · ${uploadedAt} 업로드` : `${documentLabels[activeId]} · 아직 업로드하지 않았어요`}</span></div>
      </div>
      {current ? <PreviewFile file={current.file} page={previewPage} /> : canEditActive ? <EmptyUpload onFileSelect={(file) => onFileSelect(file, activeId)} /> : <div className="check-empty-upload">이 서류는 이번 보완 대상이 아니에요.</div>}
      <div className="check-preview-footer"><div className="check-legend">{activeId !== 'receipts' && <span><i className="check-legend__recommend" />오류</span>}<span><i className="check-legend__unverifiable" />확인 필요</span><small>번호는 오른쪽 결과 카드와 같아요</small></div><span className="check-pager">1 / 1</span></div>
    </section>
    <aside className="check-aside">
      <section className="check-progress-card"><div className="check-progress-card__head"><strong>제출 서류 3개 중 {passedCount}개 통과</strong><span>{passedCount}/3</span></div><div className="check-progress-card__track"><span style={{ width: `${(passedCount / 3) * 100}%` }} /></div><div className="check-progress-card__items">{ids.map((id) => <button className={activeId === id ? 'is-active' : ''} key={id} onClick={() => onTabChange(id)} type="button"><span className="check-progress-card__dot" /><span>{documentLabels[id]}</span><small>{checkingId === id ? '검사 중' : documentStatusLabel(documents[id])}</small></button>)}</div></section>
      {isChecking && <section className="check-result-card" role="status"><h2>AI 검사 중</h2><p>업로드한 파일을 시연용 결과에 연결하고 있어요.</p></section>}
      {!isChecking && activeId === 'receipts' && current?.source === 'AZURE_OPENAI_INTEGRATED' && <section className="check-result-card" role="status"><h2>검수 범위 안내</h2><p>전체 {String(current.metadata.totalPages ?? '?')}쪽 · Azure OCR {String(current.metadata.azureLayoutPages ?? '?')}쪽 · {String(current.metadata.coverage ?? '범위 확인 필요')}</p>{current.metadata.openAiVisionOk !== true && <p>현재 Azure AI 단독 검수 모드입니다. 이 안내는 서류 오류나 보완 항목이 아닙니다.</p>}{Array.isArray(current.metadata.extractionWarnings) && current.metadata.extractionWarnings.length > 0 && <p>Azure 추출 불확실성 {current.metadata.extractionWarnings.length}건이 있습니다. 문서 오류로 판정하지 않았으며 필요하면 원본과 대조해 주세요.</p>}</section>}
      {!isChecking && current && <>{current.source === 'MOCK' && <p className="check-mock-note">시연용 mock 검사 결과 · 실제 파일 내용은 분석하지 않았어요.</p>}{current.source === 'AI_ERROR' && <p className="check-mock-note">실제 AI 분석 요청이 실패했습니다. Mock 결과로 대체하지 않았습니다.</p>}{current.source === 'NOT_SUPPORTED' && <p className="check-mock-note">이 서류는 아직 실제 AI 분석을 지원하지 않습니다.</p>}{current.source.startsWith('AZURE') && <p className="check-mock-note">실제 Azure AI 추출 결과에 검수 규칙을 적용했습니다. 담당자 최종 승인은 별도 절차입니다.</p>}{finding.length ? finding.map((item) => { const targetPage = item.evidencePage ?? item.page; const navigable = typeof targetPage === 'number' && targetPage > 0; return <section className={`check-result-card check-result-card--${item.tone}${navigable ? ' is-navigable' : ''}`} key={`${item.number}-${item.title}`} onClick={navigable ? () => setPreviewPage(targetPage) : undefined} onKeyDown={navigable ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPreviewPage(targetPage) } } : undefined} role={navigable ? 'button' : undefined} tabIndex={navigable ? 0 : undefined}><div className="check-result-card__head"><span className="check-result-card__number">{item.number}</span><span className="check-result-card__ai">✦ AI 검사</span><span className={`check-result-card__state ${item.status}`}>{item.status === 'pass' ? resultText[item.status] : documentStatusLabel({ ...current, status: item.status, findings: [item] })}</span></div><h2>{item.title}</h2><p className="check-result-card__location">{item.location}{navigable && ` · ${targetPage}쪽으로 이동`}</p><div className="check-result-card__advice">{item.advice}</div><Button disabled={isResubmitting && !editableIds.includes(activeId)} variant="secondary" size="small" onClick={(event) => { event.stopPropagation(); onReupload(activeId) }}>수정하기</Button></section> }) : current.status !== 'pass' ? <section className="check-result-card"><div className="check-result-card__head"><span className="check-result-card__ai">✦ AI 검사</span><span className={`check-result-card__state ${current.status}`}>{documentStatusLabel(current)}</span></div><h2>검사 상태를 확인해 주세요</h2><p>세부 보완 항목은 없지만 분석 완료 상태를 통과로 확인하지 못했습니다.</p></section> : isResubmitting && passedCount === 3 ? <section className="check-result-card check-result-card--resubmit-pass"><span className="check-result-card__pass-icon">✓</span><h2>AI 확인 완료 · 재제출해도 좋아요</h2><p>점검 {checkRound}회차{checkTime && ` · ${checkTime}`}</p></section> : <section className="check-result-card check-result-card--pass"><div className="check-result-card__head"><span className="check-result-card__ai">✦ AI 검사</span><span className="check-result-card__state pass">통과</span></div><h2>확인된 보완 항목이 없어요</h2><p>담당자 최종 승인은 제출 후 별도로 진행됩니다.</p></section>}</>}
    </aside>
  </div>
}
