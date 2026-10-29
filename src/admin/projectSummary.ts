// The 담당자 project list shared by D1, D12 프로젝트 목록 and each project's D5.
// Only 2026 창업동아리 has live mock 신청자 with 서류 (D6~D9); the others have a 명단 only.
import type { AdminProject, CreatedProject } from '../api/adminApi'
import { adminProjectOrg, otherProjectApplicants, otherProjects, pendingStatuses } from './mockAdminData'
import type { AdminApplicant, AdminStatus } from './mockAdminData'

export type ProjectSummary = { id: string; name: string; org: string; total: number; submitted: number; pending: number; revision: number; approved: number; deadlineAt: string; hasDetail: boolean }

const countOf = (applicants: AdminApplicant[], statuses: AdminStatus[]) => applicants.filter((applicant) => statuses.includes(applicant.status)).length

/** 2026 창업동아리 (live), then projects made with 새 프로젝트 만들기 (newest first), then the two fixed design projects. */
export function summarizeProjects(main: AdminProject, applicants: AdminApplicant[], createdProjects: CreatedProject[]): ProjectSummary[] {
  return [
    {
      id: main.id, name: main.name, org: adminProjectOrg, total: applicants.length, deadlineAt: main.deadlineAt ?? '', hasDetail: true,
      submitted: applicants.filter((applicant) => applicant.status !== 'DRAFT').length,
      pending: countOf(applicants, pendingStatuses), revision: countOf(applicants, ['NEEDS_REVISION']), approved: countOf(applicants, ['APPROVED']),
    },
    ...[...createdProjects].reverse().map((created) => ({ id: created.id, name: created.name, org: created.org, total: created.rosterCount, submitted: 0, pending: 0, revision: 0, approved: 0, deadlineAt: created.deadlineAt, hasDetail: false })),
    ...otherProjects.map((other) => ({ id: other.id, name: other.name, org: other.org, total: other.total, submitted: other.submitted, pending: other.pending, revision: other.revision, approved: other.approved, deadlineAt: other.deadlineAt, hasDetail: false })),
  ]
}

/** The project header D5 shows (name, 마감, ZIP 파일 이름). */
export function projectView(id: string, main: AdminProject, createdProjects: CreatedProject[]): AdminProject | null {
  if (id === main.id) return main
  const created = createdProjects.find((item) => item.id === id)
  if (created) return { id, name: created.name, deadlineAt: created.deadlineAt, linkSharedAt: created.createdAt, zipFileName: `${created.slug}.zip` }
  const other = otherProjects.find((item) => item.id === id)
  if (other) return { id, name: other.name, deadlineAt: other.deadlineAt, linkSharedAt: '', zipFileName: `${other.name.replace(/\s+/g, '_')}.zip` }
  return null
}

/** D5 rows for a project. Rows of the projects without 서류 data have no AI 결과 and cannot open D6. */
export function projectApplicants(id: string, main: AdminProject, applicants: AdminApplicant[], createdProjects: CreatedProject[]): AdminApplicant[] {
  if (id === main.id) return applicants
  const noAi = { error: 0, review: 0 }
  const created = createdProjects.find((item) => item.id === id)
  if (created) return (created.roster ?? []).map((row) => ({ applicantId: `${id}-${row.id}`, name: row.name, studentId: row.studentId, status: 'DRAFT', aiSummary: noAi, lastSubmittedAt: null }))
  const other = otherProjects.find((item) => item.id === id)
  if (other) return otherProjectApplicants.filter((row) => row.projectName === other.name).map((row) => ({ applicantId: row.key, name: row.name, studentId: row.studentId, status: row.status, aiSummary: noAi, lastSubmittedAt: row.lastSubmittedAt }))
  return []
}
