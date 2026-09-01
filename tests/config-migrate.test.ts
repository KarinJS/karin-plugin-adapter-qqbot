/**
 * 配置迁移：已废弃的 markdown 字段必须被丢弃。
 *
 * 2.0 之前 markdown.enable 默认为 false，2.0 删除该字段，2.1 又以默认 true 重新引入；
 * 老配置里残留的 false 曾静默覆盖新默认值，把用户按回经典发送通道，表现为
 * "一部分消息走 Markdown 一部分不走"。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Config } from '@/types/config'

let mod: typeof import('@/utils/config')
let sandbox: string
let originalCwd: string

/** 老版本写出来的配置：markdown 字段仍然留在文件里。 */
const legacyItem = {
  appId: '1234567890',
  secret: 'secret',
  qqEnable: true,
  guildEnable: true,
  guildMode: 0,
  regex: [],
  markdown: { enable: false },
  event: { type: 2 },
}

const has = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

beforeAll(async () => {
  originalCwd = process.cwd()
  sandbox = mkdtempSync(join(tmpdir(), 'qqbot-config-test-'))
  /** karinPathBase 跟随 cwd：先进沙箱再导入，别让配置监听挂到仓库里的真实开发配置上。 */
  process.chdir(sandbox)
  mod = await import('@/utils/config')
})

afterAll(() => {
  process.chdir(originalCwd)
  try {
    rmSync(sandbox, { recursive: true, force: true })
  } catch { /* Windows 上句柄未释放时忽略 */ }
})

describe('formatConfig', () => {
  it('默认配置不再包含 markdown 开关', () => {
    expect(has(mod.getDefaultConfig()[0], 'markdown')).toBe(false)
  })

  it('丢弃老配置里的 markdown 字段', () => {
    const [migrated] = mod.formatConfig([legacyItem] as unknown as Config)
    expect(has(migrated, 'markdown')).toBe(false)
  })

  it('丢弃 markdown 的同时保留其余字段', () => {
    const [migrated] = mod.formatConfig([legacyItem] as unknown as Config)
    expect(migrated.appId).toBe('1234567890')
    expect(migrated.secret).toBe('secret')
    expect(migrated.guildEnable).toBe(true)
    expect(migrated.event.type).toBe(2)
  })

  it('缺失的嵌套配置用默认值补齐', () => {
    const [migrated] = mod.formatConfig([legacyItem] as unknown as Config)
    expect(migrated.messageCache.level).toBe('standard')
    expect(migrated.messageCache.enable).toBe(false)
    expect(migrated.messageCache.ttlHours).toBe(24)
  })

  it('越界的缓存参数夹回合法区间', () => {
    const [migrated] = mod.formatConfig([{
      ...legacyItem,
      messageCache: { enable: true, self: true, level: '不存在的分级', ttlHours: 99999, maxRows: 1 },
    }] as unknown as Config)
    expect(migrated.messageCache.level).toBe('standard')
    expect(migrated.messageCache.ttlHours).toBe(720)
    expect(migrated.messageCache.maxRows).toBe(1000)
  })

  it('对已迁移的配置幂等', () => {
    const once = mod.formatConfig([legacyItem] as unknown as Config)
    const twice = mod.formatConfig(once)
    expect(twice).toEqual(once)
  })
})
