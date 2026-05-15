import EventEmitter from 'node:events'
import { log } from '@/utils/logger'
import type { Event } from '@/types/event'

/**
 * 全局事件总线
 * 每个 appId 一个 channel，业务层（dispatcher）通过 on(appId, handler) 订阅
 */
export const bus = new EventEmitter()
bus.setMaxListeners(0)

/**
 * 推送一条事件到业务层
 */
export const dispatch = (appId: string, ev: Event) => {
  const n = bus.listenerCount(appId)
  log('debug', `${appId}: bus.dispatch t=${ev.t} listeners=${n}`)
  if (n === 0) {
    log('warn', `${appId}: 收到事件 ${ev.t} 但没有监听器（dispatcher 未注册或已被移除）`)
  }
  bus.emit(appId, ev)
}

/**
 * 注销某个 appId 的所有监听器
 * 重连 / 销毁 bot 时调用
 */
export const offAll = (appId: string) => {
  bus.removeAllListeners(appId)
}
