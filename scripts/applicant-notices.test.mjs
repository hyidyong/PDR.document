import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import test from 'node:test'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../src/store/applicantNotices.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
vm.runInNewContext(js, { exports, require: (name) => name.includes('checkModel') ? { documentLabels: { receipts: '영수증' } } : {} })
const notice = (source, status, findings) => exports.buildApplicantNotices({ feedback: [], submissions: [], status: 'DRAFT', currentInspections: { receipts: { id: 'test', checkedAt: '2026-10-30', source, status, findings } } }, null)[0]

test('real rule id 2 is not treated as a mock review', () => {
  assert.match(notice('AZURE_OPENAI_INTEGRATED', 'RECOMMEND', [{ id: '2', kind: 'correction' }]).text, /오류 1/)
})
test('mixed correction and review counts match document cards', () => {
  assert.match(notice('AZURE_OPENAI_INTEGRATED', 'RECOMMEND', [{ id: 'E01', kind: 'correction' }, { id: 'E03', kind: 'review' }]).text, /오류 1 · 확인 필요 1/)
})
test('OpenAI informational findings do not count as errors', () => {
  assert.match(notice('OPENAI_RULES', 'RECOMMEND', [{ id: 'a', kind: 'info' }, { id: 'b', kind: 'correction' }]).text, /오류 1/)
})
