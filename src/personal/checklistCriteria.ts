import type { ChecklistResponse } from '../api'
import type { Criteria } from './personalMock'

export function checklistCriteria(response: ChecklistResponse): Criteria {
  const items = Array.isArray(response.items) ? response.items : []
  const questions = Array.isArray(response.questions) ? response.questions : []
  const submitRules = [response.deadline && `마감: ${response.deadline}`, response.filenameRule && `파일명: ${response.filenameRule}`]
    .filter((value): value is string => Boolean(value)).map((text) => ({ text }))

  return {
    title: response.programName || 'AI 생성 체크리스트', term: response.documentType || '지원사업 제출서류',
    docs: items.map((item) => ({
      name: item.title, note: item.requirement, requirement: item.requirement, issuer: item.issuer,
      howToObtain: item.howToObtain, estimatedTime: item.estimatedTime, deadline: item.deadline,
      filenameRule: item.filenameRule, sourceUrl: item.sourceUrl, sourceType: item.sourceType,
      verification: item.verification, evidence: item.evidence,
    })),
    rules: { writing: questions.map((text) => ({ text })), file: response.filenameRule ? [{ text: response.filenameRule }] : [], submit: submitRules },
    webSearchUsed: response.webSearchUsed, sourceVerification: response.sourceVerification,
    disclaimer: response.disclaimer, questions, fromApi: true,
  }
}

export function canStartChecklist(criteria: Criteria) {
  return criteria.docs.length > 0
}
