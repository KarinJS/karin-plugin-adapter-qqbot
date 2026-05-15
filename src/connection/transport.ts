import EventEmitter from 'node:events'
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
  bus.emit(appId, ev)
}

/**
 * 注销某个 appId 的所有监听器
 * 重连 / 销毁 bot 时调用
 */
export const offAll = (appId: string) => {
  bus.removeAllListeners(appId)
}
