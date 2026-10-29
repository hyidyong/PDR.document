import { useEffect, useMemo, useState } from 'react'
import type { CreatedProject } from '../api/adminApi'
import { Button, CheckIcon, FileIcon } from '../components/common'
import { showNotice } from '../store/noticeStore'
import { ArrowRightIcon, CalendarIcon, CopyIcon, DownloadIcon, InfoIcon, LinkIcon, MailIcon, UsersIcon } from './adminIcons'
import { LINK_HOST, formatDeadlineShort } from './projectDraft'
import { encodeQr } from './qrCode'

// The QR is drawn from the link itself (src/admin/qrCode.ts), one square per module.
function LinkQr({ url }: { url: string }) {
  const modules = useMemo(() => encodeQr(url), [url])
  const path = modules.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))).join('')
  return <svg aria-label={`${url} QR 코드`} className="wz-qr__code" role="img" shapeRendering="crispEdges" viewBox={`0 0 ${modules.length} ${modules.length}`}><path d={path} /></svg>
}

// D4 링크 공유. 안내 메일 and QR 저장 are not built yet (준비 중); 대시보드로 가기 returns to D1.
export function D4LinkShare({ project, onDone }: { project: CreatedProject; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const shown = `${LINK_HOST}${project.slug}`
  const url = `https://${shown}`

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true) }
    catch { showNotice('복사하지 못했어요. 링크를 직접 선택해 복사해 주세요') }
  }

  return <div className="wz-share">
    <div className="wz-success">
      <span className="wz-success__check"><CheckIcon width={30} height={30} /></span>
      <span><h1>프로젝트 링크를 만들었어요</h1><p>이 링크 하나로 모든 신청자가 서류를 제출해요.</p></span>
    </div>

    <section className="wz-card wz-link-card">
      <div className="wz-link">
        <span className="wz-label">프로젝트 제출 링크</span>
        <div className="wz-link__row">
          <span className="wz-link__box"><LinkIcon width={16} height={16} /><strong>{shown}</strong></span>
          <Button onClick={() => void copy()} size="large" variant="secondary">{copied ? <><CheckIcon width={16} height={16} />복사했어요</> : <><CopyIcon width={16} height={16} />복사</>}</Button>
        </div>
        <span className="wz-link__guide"><InfoIcon width={16} height={16} />{project.rosterMode === 'list' ? '신청자가 로그인하면 명단과 자동으로 연결돼요' : '링크로 들어와 로그인한 사람이 명단에 추가돼요'}</span>
        <div className="wz-link__meta">
          <span><UsersIcon width={14} height={14} />{project.rosterMode === 'list' ? `명단 ${project.rosterCount}명` : '명단 링크로 받기'}</span>
          <span><CalendarIcon width={14} height={14} />마감 {formatDeadlineShort(project.deadlineAt)}</span>
          <span><FileIcon width={14} height={14} />제출 서류 {project.documents.length}개</span>
        </div>
      </div>
      <div className="wz-qr">
        <span className="wz-qr__box"><LinkQr url={url} /></span>
        <button className="wz-qr__save" onClick={() => showNotice('QR 저장은 준비 중이에요')} type="button"><DownloadIcon width={14} height={14} />QR 저장</button>
      </div>
    </section>

    <div className="wz-share__buttons">
      <Button onClick={() => showNotice('안내 메일 보내기는 준비 중이에요')} size="large" variant="secondary"><MailIcon width={16} height={16} />명단에 안내 메일 보내기</Button>
      <Button onClick={onDone} size="large">대시보드로 가기<ArrowRightIcon width={16} height={16} /></Button>
    </div>
  </div>
}
