export const DEFAULT_PROJECT_DEADLINE = '2026-10-31T23:59:59+09:00'
export const PROJECT_TIME_ZONE = 'Asia/Seoul'

type DateParts = { year: number; month: number; day: number }

function dateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PROJECT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}

function dayNumber(parts: DateParts) {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000)
}

export function resolveProjectDeadline(deadlineAt?: string | null) {
  return deadlineAt && Number.isFinite(Date.parse(deadlineAt)) ? deadlineAt : DEFAULT_PROJECT_DEADLINE
}

export function formatDeadlineStatus(deadlineAt?: string | null, now = new Date()) {
  const deadline = new Date(resolveProjectDeadline(deadlineAt))
  if (now.getTime() > deadline.getTime()) return '마감 완료'
  const days = dayNumber(dateParts(deadline)) - dayNumber(dateParts(now))
  return days === 0 ? 'D-Day' : `D-${days}`
}

export function formatDeadlineDate(deadlineAt?: string | null) {
  const { month, day } = dateParts(new Date(resolveProjectDeadline(deadlineAt)))
  return `${month}월 ${day}일`
}

export function formatDeadlineBadge(deadlineAt?: string | null, now = new Date()) {
  const status = formatDeadlineStatus(deadlineAt, now)
  return status === '마감 완료' ? status : `마감 ${formatDeadlineDate(deadlineAt)} · ${status}`
}

export function formatDeadlineCompact(deadlineAt?: string | null, now = new Date()) {
  const status = formatDeadlineStatus(deadlineAt, now)
  return status === '마감 완료' ? status : `마감 ${status}`
}

export function formatDeadlineGuide(deadlineAt?: string | null, now = new Date()) {
  const status = formatDeadlineStatus(deadlineAt, now)
  return status === '마감 완료' ? status : `${formatDeadlineDate(deadlineAt)}까지 · ${status}`
}
