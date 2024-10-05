import { QQBotApi } from '@/api/other'
import { FileEnum, IdType, PathType, SendChannelMessageOptions, SendMessageOptions } from '@/types'
import { common } from '@/utils'
import { KarinElement, ReplyReturn } from 'node-karin'

/**
 * 常规QQ平台发送消息
 * @param api QQBotApi
 * @param targetId 用户、群openid
 * @param type 发送目标场景类型
 * @param data 消息内容
 */
export const sendQQMessage = async (api: QQBotApi, targetId: string, type: PathType, data: Array<KarinElement>) => {
  let seq = common.random(1, 999999)
  const messageId = data.find(i => i.type === 'pasmsg')?.id

  /** 待发送列表 */
  const sendList: SendMessageOptions[] = []

  /** 处理单个KarinElement */
  const processElement = async (i: KarinElement, index: number) => {
    const results = []

    switch (i.type) {
      case 'text': {
        const qr = await common.getQQBotText(i.text)
        results.push({ index, options: api.buildText(qr.text, messageId, ++seq) })
        if (qr.data) {
          const { file_info: fileInfo } = await api.uploadMedia(targetId, type, qr.data.base64, FileEnum.Image)
          results.push({ index, options: api.buildMedia(fileInfo, messageId, ++seq) })
        }
        break
      }
      case 'reply':
        // 新增一个字段来进行传参进行被动回复事件更合适
        break
      case 'record': {
        const file = await common.voiceToSilk(i.file)
        const { file_info: fileInfo } = await api.uploadMedia(targetId, type, file, FileEnum.Record)
        results.push({ index, options: api.buildMedia(fileInfo, messageId, ++seq) })
        break
      }
      case 'image':
      case 'video':
      case 'file': {
        const fileTypeMap = {
          image: FileEnum.Image,
          video: FileEnum.Video,
          file: FileEnum.File,
        }
        const { file_info: fileInfo } = await api.uploadMedia(targetId, type, i.file, fileTypeMap[i.type])
        results.push({ index, options: api.buildMedia(fileInfo, messageId, ++seq) })
        break
      }
      default:
        break
    }

    return results
  }

  /** 采用并发上传 */
  const allResults = await Promise.all(data.map(processElement))

  /** 整理发送列表 */
  allResults.flat().sort((a, b) => a.index - b.index).forEach(result => {
    sendList.push(result.options)
  })

  const result: ReplyReturn = {
    message_id: '',
    message_time: 0,
    raw_data: [],
  }

  /** 并发发送 */
  await Promise.all(sendList.map(async (v, index) => {
    if (index !== 0) await new Promise(resolve => setTimeout(resolve, index * 100))
    const res = await api.sendMessage(targetId, type, v)
    result.raw_data.push(res)
  }))

  if (result.raw_data.length > 0) {
    result.message_id = result.raw_data[0].id
    result.message_time = result.raw_data[0].time
  }

  return result
}

/**
 * 常规频道发送消息
 * @param api QQBotApi
 * @param targetId 子频道id、频道id
 * @param type 发送目标场景类型
 * @param data 消息内容
 * @returns
 */
export const sendGuildMessage = async (api: QQBotApi, targetId: string, type: PathType, data: Array<KarinElement>) => {
  const messageId = data.find(i => i.type === 'pasmsg')?.id
  const image = []
  const content: string[] = []
  /** 待发送列表 */
  const sendList: { index: number, options: SendChannelMessageOptions }[] = []

  /** 先循环一次 进行分类 */
  for (const v of data) {
    switch (v.type) {
      case 'text':
        content.push(v.text)
        break
      case 'image':
        image.push(v.file)
        break
      default:
        content.push(`[未知消息类型:${JSON.stringify(v)}]`)
    }
  }

  /** 看第一个图片是不是http */
  if (image.length > 0 && image[0].startsWith('http')) {
    const options: SendChannelMessageOptions = {
      content: content.join(''),
      /** http地址直接丢给平台转存 */
      image: image.shift(),
    }
    if (messageId) options[IdType.MsgID] = messageId
    sendList.push({ index: -1, options })
  } else if (image.length) {
    /** 如果不是 就转FormData */
    const img = image.shift()
    const file = await common.buffer(img as string)
    const blob = new Blob([file])
    const formData = new FormData()
    formData.append('content', content.join(''))
    formData.append('file_image', blob)
    if (messageId) formData.append(IdType.MsgID, messageId)
    sendList.push({ index: -1, options: formData as any })
  } else {
    /** 没有图片 */
    const options: SendChannelMessageOptions = { content: content.join('') }
    if (messageId) options[IdType.MsgID] = messageId
    sendList.push({ index: -1, options })
  }

  const result: ReplyReturn = {
    message_id: '',
    message_time: 0,
    raw_data: [],
  }

  /** 并发发送 */
  await Promise.all(sendList.map(async (v, index) => {
    if (index !== 0) await new Promise(resolve => setTimeout(resolve, index * 100))
    const res = await api.sendMessage(targetId, type, v.options)
    result.raw_data.push(res)
  }))

  if (result.raw_data.length > 0) {
    result.message_id = result.raw_data[0].id
    result.message_time = result.raw_data[0].time
  }

  return result
}
