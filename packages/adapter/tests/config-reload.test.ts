/**
 * 配置保存后的运行时重载。
 *
 * Web 保存会先写盘再立即读回配置，node-karin 的 require 缓存因此可能
 * 把"旧配置"也刷成新值；重载逻辑必须以运行时快照为准，并且只处理
 * 真正发生变化的机器人。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { QQBotConfig } from '@/types/config'

let mod: typeof import('@/utils/config')
let sandbox: string
let originalCwd: string
let created: string[] = []
let destroyed: string[] = []

const base = (appId: string, overrides: Partial<QQBotConfig> = {}): QQBotConfig => ({
  ...mod.getDefaultConfig()[0],
  appId,
  secret: 'secret',
  event: { type: 2 },
  ...overrides,
})

beforeAll(async () => {
  originalCwd = process.cwd()
  sandbox = mkdtempSync(join(tmpdir(), 'qqbot-config-reload-'))
  /** karinPathBase 跟随 cwd：先进沙箱再导入，避免动到仓库里的开发配置。 */
  process.chdir(sandbox)
  mod = await import('@/utils/config')
  mod.bindHandlers(
    async (cfg) => {
      created.push(cfg.appId)
    },
    (appId) => {
      destroyed.push(appId)
    }
  )
})

afterAll(() => {
  process.chdir(originalCwd)
  try {
    rmSync(sandbox, { recursive: true, force: true })
  } catch {
    /* Windows 上句柄未释放时忽略 */
  }
})

beforeEach(async () => {
  /** 每个用例都从 a、b 两个机器人开始，清掉准备阶段的记录。 */
  await mod.writeConfig([base('a'), base('b')])
  created = []
  destroyed = []
})

describe('配置保存后的重载', () => {
  it('配置没有变化时不重载任何机器人', async () => {
    await mod.writeConfig([base('a'), base('b')])
    expect(destroyed).toEqual([])
    expect(created).toEqual([])
  })

  it('只重载发生变化的机器人', async () => {
    await mod.writeConfig([base('a'), base('b', { secret: 'new-secret' })])
    expect(destroyed).toEqual(['b'])
    expect(created).toEqual(['b'])
  })

  it('多机器人时只重载有修改的对象', async () => {
    await mod.writeConfig([base('a'), base('b'), base('c')])
    created = []
    destroyed = []

    await mod.writeConfig([base('a'), base('b', { secret: 'new-secret' }), base('c')])
    expect(destroyed).toEqual(['b'])
    expect(created).toEqual(['b'])
  })

  it('新增机器人时只创建新增项', async () => {
    await mod.writeConfig([base('a'), base('b'), base('c')])
    expect(destroyed).toEqual([])
    expect(created).toEqual(['c'])
  })

  it('删除机器人时只销毁被删除项', async () => {
    await mod.writeConfig([base('a')])
    expect(destroyed).toEqual(['b'])
    expect(created).toEqual([])
  })

  it('切换连接方式时重载对应机器人', async () => {
    await mod.writeConfig([base('a'), base('b', { event: { type: 1 } })])
    expect(destroyed).toEqual(['b'])
    expect(created).toEqual(['b'])
  })

  it('关闭事件接收时只销毁不重建', async () => {
    await mod.writeConfig([base('a'), base('b', { event: { type: 0 } })])
    expect(destroyed).toEqual(['b'])
    expect(created).toEqual([])
  })

  it('调用方原地修改 config() 缓存后仍能识别变化', async () => {
    const list = mod.config()
    const index = list.findIndex((item) => item.appId === 'b')
    list[index].secret = 'mutated'
    await mod.writeConfig(list)
    expect(destroyed).toEqual(['b'])
    expect(created).toEqual(['b'])
  })

  it('保存后强制重读配置文件不会吞掉重载', async () => {
    /** 复现 Web 保存流程：写盘、立即 readConfigFile，再触发运行时应用。 */
    await mod.writeConfig([base('a'), base('b', { secret: 'new-secret' })])
    mod.readConfigFile()
    expect(destroyed).toEqual(['b'])
    expect(created).toEqual(['b'])
  })

  it('文件监听以运行时快照为准，不受 require 缓存影响', async () => {
    /** 模拟文件被外部修改：先刷新 require 缓存，再把新配置交给监听回调。 */
    mod.readConfigFile()
    await mod.applyConfigChange([base('a'), base('b', { secret: 'external' })])
    expect(destroyed).toEqual(['b'])
    expect(created).toEqual(['b'])
  })
})
