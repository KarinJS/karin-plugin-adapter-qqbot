import { MessageStore } from './store'

/** 单一 SQLite 连接：所有 bot 共用同一份缓存表与清理任务。 */
let store: MessageStore | undefined

export const getMessageStore = (): MessageStore => {
  store ||= new MessageStore()
  return store
}

export { MessageStore }
