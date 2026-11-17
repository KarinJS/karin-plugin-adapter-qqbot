import axios from 'node-karin/axios'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { vi } from 'vitest'
import type { AdapterQQBot } from '@/core/adapter/base'
import type { AxiosInstance } from '@/core/api/http'
import type { MessageStore } from '@/core/storage/message'
import type { QQBotConfig } from '@/types/config'

export interface RecordedRequest {
  method: string
  url: string
  body?: unknown
}

/** Windows 下关闭日志文件句柄后再删除测试临时目录。 */
export const closeTestLogs = async (): Promise<void> => {
  const { default: log4js } = await import('node-karin/log4js')
  await new Promise<void>((resolve, reject) => log4js.shutdown((error) => (error ? reject(error) : resolve())))
}

/** 只删除本轮测试创建的 qqbot 临时目录，Windows 延迟释放的日志句柄可留到进程退出。 */
export const cleanupTestSandbox = async (sandbox: string, originalCwd: string): Promise<void> => {
  await closeTestLogs()
  process.chdir(originalCwd)
  const target = resolve(sandbox)
  if (dirname(target).toLowerCase() !== resolve(tmpdir()).toLowerCase() || !basename(target).startsWith('qqbot-')) {
    throw new Error(`Unexpected test sandbox: ${target}`)
  }
  try {
    rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (process.platform !== 'win32' || (code !== 'EPERM' && code !== 'EBUSY')) throw error
  }
}

/** 仅替换 HTTP 传输与数据库写入，API 模块、bot 和 Karin 消息构造保持真实。 */
export const createBot = async (
  respond: (request: RecordedRequest) => unknown | Promise<unknown>,
  appId = 'test-app'
) => {
  const [{ AdapterQQBot }, { QQBotApi }] = await Promise.all([import('@/core/adapter/base'), import('@/core/api')])
  const requests: RecordedRequest[] = []
  const transport = axios.create({
    baseURL: 'https://api.bot.qq.com',
    adapter: async (config) => {
      const url = new URL(axios.getUri(config))
      const request: RecordedRequest = {
        method: config.method || 'get',
        url: url.pathname + url.search,
        ...(config.data === undefined
          ? {}
          : { body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data }),
      }
      requests.push(request)
      return { config, status: 200, statusText: 'OK', headers: {}, data: await respond(request) }
    },
  })
  const cfg: QQBotConfig = {
    appId,
    secret: 'test-secret',
    qqEnable: true,
    guildEnable: true,
    guildMode: 0,
    regex: [],
    messageCache: { enable: true, self: true, level: 'full', ttlHours: 24, maxRows: 1000 },
    event: { type: 2 },
  }
  const bot: AdapterQQBot = new AdapterQQBot(cfg, new QQBotApi(transport as AxiosInstance))
  bot.account.selfId = appId
  bot.account.name = '测试机器人'
  bot.account.subId.id = 'bot-user-id'
  bot.logger = vi.fn()

  const savedMessages: unknown[] = []
  vi.spyOn(bot, 'messageStore', 'get').mockReturnValue({
    save: async (_appId: string, message: unknown) => {
      savedMessages.push(message)
    },
    saveReferenceIfAbsent: async () => {},
  } as unknown as MessageStore)

  return { bot, requests, savedMessages }
}
