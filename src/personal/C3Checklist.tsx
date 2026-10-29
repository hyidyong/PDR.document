import { useState } from 'react'
import { Button, CheckIcon, FileIcon, PencilIcon, SparklesIcon } from '../components/common'
import { formatMonthDay, ruleGroupLabels, sourceExcerpt } from './personalMock'
import type { Criteria, RuleGroupId } from './personalMock'

type EditTarget = 'docs' | RuleGroupId | null
const groupIds: RuleGroupId[] = ['writing', 'file', 'submit']

function AlertIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M12 4 3 19.5h18L12 4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M12 10v4.5M12 17v.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>
}

function RuleIcon({ id }: { id: RuleGroupId }) {
  if (id === 'writing') return <PencilIcon />
  if (id === 'file') return <FileIcon />
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><rect height="16" rx="2" stroke="currentColor" strokeWidth="1.7" width="16" x="4" y="5" /><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></svg>
}

function EditButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button aria-label={active ? `${label} 수정 완료` : `${label} 수정`} className={`c3-edit-button ${active ? 'is-active' : ''}`} onClick={onClick} type="button">{active ? <CheckIcon /> : <PencilIcon />}</button>
}

export function C3Checklist({ criteria, sourceDate, onChange, onStart }: { criteria: Criteria; sourceDate: Date; onChange: (criteria: Criteria) => void; onStart: () => void }) {
  const [editing, setEditing] = useState<EditTarget>(null)
  const toggle = (target: EditTarget) => setEditing((current) => current === target ? null : target)
  const updateDoc = (index: number, key: 'name' | 'note', value: string) => onChange({ ...criteria, docs: criteria.docs.map((doc, i) => i === index ? { ...doc, [key]: value } : doc) })
  const updateRule = (group: RuleGroupId, index: number, value: string) => onChange({ ...criteria, rules: { ...criteria.rules, [group]: criteria.rules[group].map((rule, i) => i === index ? { ...rule, text: value } : rule) } })

  return <main className="personal-main">
    <div className="personal-page-header">
      <div className="c3-title-row"><h1>AI가 찾은 제출 기준이에요</h1><span className="c3-ai-label"><SparklesIcon />AI 추출</span></div>
      <p>틀린 부분은 고쳐주세요. 연필 아이콘을 누르면 바로 수정할 수 있어요.</p>
    </div>
    <div className="personal-body">
      <div className="personal-content">
        <section className="personal-card c3-docs">
          <div className="c3-docs__head"><div><span>제출해야 할 서류</span><h2>서류 {criteria.docs.length}개</h2></div><EditButton active={editing === 'docs'} label="제출 서류" onClick={() => toggle('docs')} /></div>
          <div className="c3-doc-tiles">{criteria.docs.map((doc, index) => <div className="c3-doc-tile" key={index}>
            <span className="c3-doc-tile__number">{String(index + 1).padStart(2, '0')}</span>
            {editing === 'docs'
              ? <div className="c3-doc-tile__edit"><input aria-label={`${index + 1}번 서류 이름`} onChange={(event) => updateDoc(index, 'name', event.target.value)} value={doc.name} /><input aria-label={`${index + 1}번 서류 메모`} onChange={(event) => updateDoc(index, 'note', event.target.value)} value={doc.note} /></div>
              : <div><strong>{doc.name}</strong><span>{doc.note}</span></div>}
          </div>)}</div>
        </section>

        <div className="c3-rule-cards">{groupIds.map((group) => <section className="personal-card c3-rule-card" key={group}>
          <div className="c3-rule-card__head"><h2><RuleIcon id={group} />{ruleGroupLabels[group]}</h2><EditButton active={editing === group} label={ruleGroupLabels[group]} onClick={() => toggle(group)} /></div>
          <ul>{criteria.rules[group].map((rule, index) => <li key={index}>
            <span className="c3-rule-check"><CheckIcon /></span>
            {editing === group
              ? <input aria-label={`${ruleGroupLabels[group]} ${index + 1}`} onChange={(event) => updateRule(group, index, event.target.value)} value={rule.text} />
              : <div><strong>{rule.text}</strong>{rule.example && <small>{rule.example}</small>}</div>}
          </li>)}</ul>
        </section>)}</div>

        <section className="personal-card c3-uncertain">
          <span className="c3-uncertain__icon"><AlertIcon /></span>
          <div><strong>한 번 확인해 주세요</strong><p>공고문에 활동 기간이 없어서, 사업 기간(9월 1일~10월 31일)을 기준으로 넣었어요.</p></div>
          <Button variant="secondary" onClick={() => setEditing('writing')}><span className="personal-button-inner"><PencilIcon />고치기</span></Button>
        </section>

        <div className="personal-bottom-row">
          <span className="personal-hint"><SparklesIcon />고친 기준은 이번 점검에 바로 반영돼요</span>
          <Button size="large" onClick={() => { setEditing(null); onStart() }}>이대로 점검 시작</Button>
        </div>
      </div>

      <aside className="personal-aside">
        <section className="personal-card c3-source">
          <div className="personal-recent__head"><h2>AI가 읽은 공고문</h2><button type="button">원문 보기</button></div>
          <span className="c3-source__meta"><FileIcon />붙여넣은 텍스트 · {formatMonthDay(sourceDate)}</span>
          <div className="c3-source__excerpt">
            <strong>{sourceExcerpt.title}</strong>
            {sourceExcerpt.highlights.map((highlight) => <p className={`c3-highlight c3-highlight--${highlight.id}`} key={highlight.id}>{highlight.text}</p>)}
          </div>
          <span className="c3-source__legend"><SparklesIcon />색은 왼쪽 카드와 같은 기준이에요</span>
        </section>
      </aside>
    </div>
  </main>
}
