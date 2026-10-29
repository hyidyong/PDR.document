// 사용법: node design/extract-frame.mjs "D5 프로젝트 대시보드"
//         node design/extract-frame.mjs --list
// Pencil 디자인 파일(design/modit_all.pen)에서 화면 하나만 뽑아 design/out/ 에 저장합니다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PEN = path.join(path.dirname(fileURLToPath(import.meta.url)), 'modit_all.pen')
const doc = JSON.parse(fs.readFileSync(PEN, 'utf8'))
const arg = process.argv.slice(2).join(' ').trim()
const SCREEN = /^[A-D]\d(-[a-z])? (?!Page$)/

const screens = []
const walk = (node) => {
  if (node.type === 'frame' && SCREEN.test(node.name ?? '')) screens.push(node)
  for (const child of node.children ?? []) walk(child)
}
doc.children.forEach(walk)

if (!arg || arg === '--list') {
  console.log(screens.map((s) => s.name).join('\n'))
  process.exit(0)
}

const target = screens.find((s) => s.name === arg) ?? screens.find((s) => s.name.startsWith(arg))
if (!target) {
  console.error(`"${arg}" 화면을 찾지 못했어요. --list 로 이름을 확인하세요.`)
  process.exit(1)
}
const outDir = path.join(path.dirname(PEN), 'out')
fs.mkdirSync(outDir, { recursive: true })
const file = path.join(outDir, `${target.name.split(' ')[0]}.json`)
fs.writeFileSync(file, JSON.stringify(target, null, 1))
fs.writeFileSync(path.join(outDir, 'design_variables.json'), JSON.stringify(doc.variables ?? {}, null, 1))
console.log(`저장: ${file}`)
