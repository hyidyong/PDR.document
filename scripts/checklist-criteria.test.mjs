import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const source = readFileSync(new URL('../src/personal/checklistCriteria.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
vm.runInNewContext(js, { exports, require: () => ({}) })

const response = (overrides = {}) => ({
  schema_version: '2.0', programName: '테스트 사업', documentType: '지원사업 제출서류', deadline: null,
  filenameRule: null, questions: ['확인 질문'], webSearchUsed: false, sourceVerification: '', disclaimer: '',
  items: [{ title: '증명서', requirement: '필수', issuer: '발급기관', howToObtain: '온라인', estimatedTime: '1일',
    deadline: null, filenameRule: null, sourceUrl: 'https://example.com', sourceType: '공식', verification: '확인', evidence: '공고문', notes: '' }],
  ...overrides,
})

test('missing or null questions become an empty list', () => {
  for (const questions of [undefined, null]) {
    const criteria = exports.checklistCriteria(response({ questions }))
    assert.equal(criteria.questions.length, 0)
    assert.equal(criteria.rules.writing.length, 0)
  }
})

test('empty items cannot start a document check', () => {
  const criteria = exports.checklistCriteria(response({ items: [] }))
  assert.equal(criteria.docs.length, 0)
  assert.equal(exports.canStartChecklist(criteria), false)
})

test('normal item details and questions are preserved', () => {
  const criteria = exports.checklistCriteria(response())
  assert.equal(exports.canStartChecklist(criteria), true)
  assert.equal(criteria.docs[0].issuer, '발급기관')
  assert.equal(criteria.docs[0].howToObtain, '온라인')
  assert.equal(criteria.docs[0].estimatedTime, '1일')
  assert.equal(criteria.docs[0].sourceUrl, 'https://example.com')
  assert.equal(criteria.rules.writing[0].text, '확인 질문')
})

test('empty checklist renders guidance and disables the start button', async () => {
  const vite = await createServer({
    server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://localhost'),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('synthetic-test-key'),
    },
  })
  try {
    const { C3Checklist } = await vite.ssrLoadModule('/src/personal/C3Checklist.tsx')
    const criteria = exports.checklistCriteria(response({ items: [], questions: null }))
    const html = renderToStaticMarkup(React.createElement(C3Checklist, {
      criteria, sourceDate: new Date('2026-10-30T00:00:00+09:00'), sourceText: '합성 공고문',
      onChange: () => {}, onStart: () => {},
    }))
    assert.match(html, /생성된 서류가 없습니다/)
    assert.match(html, /<button[^>]*disabled=""[^>]*>이대로 점검 시작<\/button>/)
  } finally {
    await vite.close()
  }
})
