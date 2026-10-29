import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_PROJECT_DEADLINE, formatDeadlineBadge, formatDeadlineCompact, formatDeadlineStatus, resolveProjectDeadline } from '../src/utils/projectDeadline.ts'

test('Asia/Seoul 날짜를 기준으로 D-2와 D-1을 계산한다', () => {
  assert.equal(formatDeadlineStatus(DEFAULT_PROJECT_DEADLINE, new Date('2026-10-29T12:00:00+09:00')), 'D-2')
  assert.equal(formatDeadlineStatus(DEFAULT_PROJECT_DEADLINE, new Date('2026-10-30T23:59:59+09:00')), 'D-1')
})

test('마감 당일 종료 시각까지 D-Day를 표시한다', () => {
  assert.equal(formatDeadlineStatus(DEFAULT_PROJECT_DEADLINE, new Date('2026-10-31T00:00:00+09:00')), 'D-Day')
  assert.equal(formatDeadlineStatus(DEFAULT_PROJECT_DEADLINE, new Date('2026-10-31T23:59:59+09:00')), 'D-Day')
})

test('마감 시각이 지나면 마감 완료를 표시한다', () => {
  const afterDeadline = new Date('2026-11-01T00:00:00+09:00')
  assert.equal(formatDeadlineStatus(DEFAULT_PROJECT_DEADLINE, afterDeadline), '마감 완료')
  assert.equal(formatDeadlineCompact(DEFAULT_PROJECT_DEADLINE, afterDeadline), '마감 완료')
  assert.equal(formatDeadlineBadge(DEFAULT_PROJECT_DEADLINE, afterDeadline), '마감 완료')
})

test('백엔드 마감일을 우선하고 값이 없거나 잘못되면 기본값을 사용한다', () => {
  const apiDeadline = '2026-12-15T23:59:59+09:00'
  assert.equal(resolveProjectDeadline(apiDeadline), apiDeadline)
  assert.equal(resolveProjectDeadline(undefined), DEFAULT_PROJECT_DEADLINE)
  assert.equal(resolveProjectDeadline('invalid'), DEFAULT_PROJECT_DEADLINE)
})
