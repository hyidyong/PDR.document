// A minimal QR Code encoder for the D4 제출 링크 (no package): byte mode, error correction L, versions 1–5.
// That fits up to 106 bytes, enough for "https://modit.kr/p/<slug>". Returns rows of dark (true) / light modules.

const EC_CODEWORDS = [0, 7, 10, 15, 20, 26]
const TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134]
const ALIGNMENT_CENTER = [0, 0, 18, 22, 26, 30]
export const QR_MAX_BYTES = TOTAL_CODEWORDS[5] - EC_CODEWORDS[5] - 2

// GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1.
const EXP: number[] = []
const LOG: number[] = []
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x
  LOG[x] = i
  x <<= 1
  if (x & 0x100) x ^= 0x11d
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
const multiply = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0)

function reedSolomon(data: number[], degree: number) {
  // Generator polynomial, highest power first.
  let generator = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(generator.length + 1).fill(0)
    generator.forEach((coefficient, j) => { next[j] ^= coefficient; next[j + 1] ^= multiply(coefficient, EXP[i]) })
    generator = next
  }
  const remainder = new Array<number>(degree).fill(0)
  for (const byte of data) {
    const factor = byte ^ (remainder.shift() ?? 0)
    remainder.push(0)
    for (let i = 0; i < degree; i++) remainder[i] ^= multiply(generator[i + 1], factor)
  }
  return remainder
}

function codewords(bytes: Uint8Array, version: number) {
  const dataCount = TOTAL_CODEWORDS[version] - EC_CODEWORDS[version]
  const bits: number[] = []
  const push = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1) }
  push(0b0100, 4)
  push(bytes.length, 8)
  bytes.forEach((byte) => push(byte, 8))
  push(0, Math.min(4, dataCount * 8 - bits.length))
  while (bits.length % 8) bits.push(0)
  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((sum, bit) => (sum << 1) | bit, 0))
  for (let pad = 0xec; data.length < dataCount; pad ^= 0xec ^ 0x11) data.push(pad)
  return [...data, ...reedSolomon(data, EC_CODEWORDS[version])]
}

const MASKS: ((y: number, x: number) => boolean)[] = [
  (y, x) => (y + x) % 2 === 0,
  (y) => y % 2 === 0,
  (_, x) => x % 3 === 0,
  (y, x) => (y + x) % 3 === 0,
  (y, x) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (y, x) => ((y * x) % 2) + ((y * x) % 3) === 0,
  (y, x) => (((y * x) % 2) + ((y * x) % 3)) % 2 === 0,
  (y, x) => (((y + x) % 2) + ((y * x) % 3)) % 2 === 0,
]

function penalty(modules: boolean[][]) {
  const size = modules.length
  let score = 0
  const lines = [...modules, ...modules.map((_, x) => modules.map((row) => row[x]))]
  for (const line of lines) {
    for (let i = 0, run = 1; i < size; i++, run++) {
      if (i === size - 1 || line[i] !== line[i + 1]) { if (run >= 5) score += run - 2; run = 0 }
    }
    const text = line.map((dark) => (dark ? '1' : '0')).join('')
    for (const pattern of ['10111010000', '00001011101']) for (let at = text.indexOf(pattern); at >= 0; at = text.indexOf(pattern, at + 1)) score += 40
  }
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const color = modules[y][x]
    if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) score += 3
  }
  const dark = modules.flat().filter(Boolean).length
  const total = size * size
  return score + (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10
}

export function encodeQr(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)
  const version = [1, 2, 3, 4, 5].find((v) => bytes.length <= TOTAL_CODEWORDS[v] - EC_CODEWORDS[v] - 2)
  if (!version) throw new Error(`QR에 넣기에는 링크가 너무 길어요 (최대 ${QR_MAX_BYTES}바이트)`)
  const size = 17 + version * 4
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const isFunction = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const set = (x: number, y: number, dark: boolean) => { modules[y][x] = dark; isFunction[y][x] = true }

  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0) }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      const distance = Math.max(Math.abs(dx), Math.abs(dy))
      set(x, y, distance !== 2 && distance !== 4)
    }
  }
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4)
  if (version > 1) {
    const c = ALIGNMENT_CENTER[version]
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
  }
  // Reserve the format areas (drawn per mask below) and the dark module.
  for (let i = 0; i < 9; i++) if (i !== 6) { set(8, i, false); set(i, 8, false) }
  for (let i = 0; i < 8; i++) { set(size - 1 - i, 8, false); set(8, size - 1 - i, false) }
  set(8, size - 8, true)

  const bits = codewords(bytes, version).flatMap((byte) => Array.from({ length: 8 }, (_, i) => ((byte >>> (7 - i)) & 1) === 1))
  let index = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vertical = 0; vertical < size; vertical++) for (let j = 0; j < 2; j++) {
      const x = right - j
      const y = ((right + 1) & 2) === 0 ? size - 1 - vertical : vertical
      if (!isFunction[y][x] && index < bits.length) modules[y][x] = bits[index++]
    }
  }

  const withMask = (mask: number) => {
    const result = modules.map((row, y) => row.map((dark, x) => (!isFunction[y][x] && MASKS[mask](y, x) ? !dark : dark)))
    const data = (0b01 << 3) | mask
    let remainder = data
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537)
    const format = ((data << 10) | remainder) ^ 0x5412
    const bit = (i: number) => ((format >>> i) & 1) === 1
    const put = (x: number, y: number, dark: boolean) => { result[y][x] = dark }
    for (let i = 0; i <= 5; i++) put(8, i, bit(i))
    put(8, 7, bit(6)); put(8, 8, bit(7)); put(7, 8, bit(8))
    for (let i = 9; i < 15; i++) put(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) put(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) put(8, size - 15 + i, bit(i))
    put(8, size - 8, true)
    return result
  }
  let best = withMask(0)
  let bestScore = penalty(best)
  for (let mask = 1; mask < 8; mask++) {
    const candidate = withMask(mask)
    const score = penalty(candidate)
    if (score < bestScore) { best = candidate; bestScore = score }
  }
  return best
}
