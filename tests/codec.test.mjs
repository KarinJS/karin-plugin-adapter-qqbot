/**
 * 消息段编解码、存储分级过滤、媒体相对路径与 ID hash 测试。
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repo = dirname(dirname(fileURLToPath(import.meta.url)))
const require = createRequire(join(repo, 'package.json'))
process.env.TSX_TSCONFIG_PATH = join(repo, 'tsconfig.json')
const { register } = require('tsx/esm/api')
register()

const src = name => pathToFileURL(join(repo, 'src/core/storage/message-store', name)).href
const { encodeElements, decodeElements, filterElementsByLevel } = await import(src('codec.ts'))
const { fromStoredFilePath, toStoredFilePath } = await import(src('media.ts'))
const { hashId } = await import(src('hash.ts'))

const assert = (cond, msg) => { if (!cond) { console.error('ASSERT FAIL: ' + msg); process.exit(1) } }

// 编解码往返
const elements = [
  { type: 'text', text: '你好 world' },
  { type: 'at', targetId: 'U123' },
  { type: 'reply', messageId: 'REFIDX_abc' },
  { type: 'face', id: 5 },
  { type: 'image', file: 'https://example.com/a.jpg', subType: 'jpeg', width: 100, height: 200 },
  { type: 'video', file: 'https://example.com/v.mp4' },
  { type: 'record', file: 'https://example.com/r.mp3', magic: false },
  { type: 'file', file: 'https://example.com/f.bin', name: 'doc.pdf' },
  { type: 'markdown', markdown: '# title' },
  { type: 'keyboard', rows: [] }, // 不支持的类型应跳过
]
const encoded = encodeElements(elements)
assert(encoded.replyTo === 'REFIDX_abc', 'replyTo extracted')
const decoded = decodeElements(encoded.json)
assert(decoded.length === 9, 'unsupported skipped, got ' + decoded.length)
assert(decoded[0].text === '你好 world', 'text roundtrip')
assert(decoded[4].file === 'https://example.com/a.jpg' && decoded[4].width === 100 && decoded[4].subType === 'jpeg', 'image roundtrip')
assert(decoded[7].name === 'doc.pdf', 'file name roundtrip')
assert(decoded[8].markdown === '# title', 'markdown roundtrip')

// record magic 变声标记往返
const magicEnc = encodeElements([{ type: 'record', file: 'https://x/r.mp3', magic: true }])
const magicDec = decodeElements(magicEnc.json)
assert(magicDec[0].magic === true, 'magic=true roundtrip')
assert(decoded[6].magic === false, 'magic=false roundtrip')

// 超长截断
const long = 'x'.repeat(10000)
const encLong = encodeElements([{ type: 'text', text: long }])
const decLong = decodeElements(encLong.json)
assert(decLong[0].text.length === 4096, 'truncated to 4096, got ' + decLong[0].text.length)

// 媒体相对路径往返
const abs = fromStoredFilePath('media://image/abc.jpg')
assert(abs.endsWith('abc.jpg') && !abs.startsWith('media://'), 'fromStored resolves: ' + abs)
const stored = toStoredFilePath(abs)
assert(stored === 'media://image/abc.jpg', 'toStored roundtrip: ' + stored)
assert(toStoredFilePath('https://x/y.jpg') === 'https://x/y.jpg', 'url passthrough')
assert(fromStoredFilePath('https://x/y.jpg') === 'https://x/y.jpg', 'url passthrough decode')

// 非法 JSON 容错
assert(decodeElements('not json').length === 0, 'bad json tolerated')
assert(decodeElements('{"a":1}').length === 0, 'non-array tolerated')

// 存储分级过滤
assert(filterElementsByLevel(elements, 'full').length === 10, 'full keeps all')
const std = filterElementsByLevel(elements, 'standard')
assert(std.length === 8 && !std.some(e => e.type === 'markdown'), 'standard drops markdown')
const min = filterElementsByLevel(elements, 'minimal')
assert(min.length === 1 && min[0].type === 'reply', 'minimal keeps reply only')
assert(filterElementsByLevel(elements).length === 8, 'default level = standard')

// hash 稳定性与分布
assert(hashId('REFIDX_abc') === hashId('REFIDX_abc'), 'hash deterministic')
assert(hashId('REFIDX_abc') !== hashId('REFIDX_abd'), 'hash sensitive')
assert(Number.isSafeInteger(hashId('x'.repeat(200))), 'hash is safe integer')
const seen = new Set()
for (let i = 0; i < 100000; i++) seen.add(hashId('ROBOT1.0_' + i))
assert(seen.size === 100000, '10w ids no collision, got ' + seen.size)

console.log('PASS codec')
process.exit(0)
