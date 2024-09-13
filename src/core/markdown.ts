// import path from 'path'
// import { Params } from './adapter'
// import { AdapterQQBot } from '.'
// import { common, common as Common } from '@/utils/common'
// import { FileType, PathType, SendChannelMessageOptions, SendMessageOptions } from '@/types'
// import {
//   ButtonElement,
//   handler,
//   ImageElement,
//   KarinElement,
//   RawKeyboardType,
//   ReplyReturn,
//   KeyBoardElement,
//   TextElement,
//   common as karinCommon,
//   ButtonType,
//   TplMarkdownElement,
//   segment,
// } from 'node-karin'

// /**
//  * 图文模板
//  */
// export async function markdownTemplate (Opt: {
//   bot: AdapterQQBot,
//   data: Array<KarinElement>,
//   type: PathType,
//   openid: string,
//   message_id?: string,
// }) {
//   const { bot, data, type, openid, message_id } = Opt

//   /** 先对消息进行分类 */
//   const text: { index: number, data: TextElement }[] = []
//   const image: { index: number, data: ImageElement }[] = []
//   /** 待发送列表 */
//   const send_list: { index: number, opt: SendMessageOptions }[] = []

//   let seq = common.random(1, 999999)
//   let keyboard: RawKeyboardType | undefined
//   const params: Params = []
//   const markdown: { index: number; custom_template_id: string; params: { key: string; values: Array<string> }[] }[] = []
//   const list: Promise<void>[] = []
//   const buttons: Array<KeyBoardElement | ButtonElement> = []
//   const imgs: { index: number; url: string; width: number; height: number }[] = []

//   const result: ReplyReturn = {
//     message_id: '',
//     message_time: 0,
//     raw_data: [],
//   }

//   const textFn = async () => {
//     text.sort((a, b) => a.index - b.index)
//     const data = Common.textToButton(text.map(v => v.data.text).join(''))
//     const val = type === PathType.Friends ? Common.formatText(data.text, true) : Common.formatText(data.text)
//     /** 去除at全体 */
//     params.push({ key: bot.markdown.oldTemplate.textStartKey, values: [val] })
//     /** 按钮 */
//     buttons.push(...data.button)
//   }

//   const imageFn = async (i: { index: number, data: ImageElement }) => {
//     const { url, width, height } = await handler.call('qqbot.files', { file: i.data.file, type: 'image', name: '0.png' })
//     imgs.push({ index: i.index, url, width, height })
//   }

//   const mediaFn = async (file: string, type: PathType, name: string, FileType: FileType) => {
//     const { url } = await handler.call('qqbot.files', { file, type, name })
//     const { file_info } = await bot.super.uploadMedia(openid, type, url, FileType)
//     const opt = bot.super.buildMedia(file_info, message_id, ++seq)
//     const res = await bot.super.sendMessage(openid, type, opt)
//     result.raw_data.push(res)
//   }

//   await Promise.all(data.map(async (data, index) => {
//     switch (data.type) {
//       case 'text': {
//         /** 先提取掉url 随后放出按钮中 */
//         const res = Common.textToButton(data.text)
//         buttons.push(...res.button)
//         const text = type === PathType.Friends ? Common.formatText(res.text, true) : Common.formatText(res.text)
//         message.push({ index, data: text })
//         break
//       }
//       case 'image':
//         image.push({ index, data })
//         break
//       case 'at': {
//         if (type === PathType.Friends) break
//         text.push({ index, data: segment.text(`<qqbot-at-user id="${data.uid || data.uin}" />`) })
//         break
//       }
//       case 'record': {
//         const file = await common.voiceToSilk(data.file)
//         list.push(mediaFn(file, type, '0.silk', FileType.Record))
//         break
//       }
//       case 'video': {
//         list.push(mediaFn(data.file, type, '0.mp4', FileType.Video))
//         break
//       }
//       case 'file': {
//         /** 判断是不是一个本地路径 */
//         let ext = Date.now() + ''
//         if (path.isAbsolute(data.file)) ext = Date.now() + path.extname(data.file)
//         list.push(mediaFn(data.file, type, ext, FileType.File))
//         break
//       }
//       case 'button': {
//         buttons.push(data)
//         break
//       }
//       case 'markdown': {
//         text.push({ index, data: { type: 'text', text: data.content } })
//         break
//       }
//       case 'markdown_tpl': {
//         markdown.push({ index, custom_template_id: data.custom_template_id, params: data.params })
//         break
//       }

//       default:
//         break
//     }
//   }))

//   if (text.length || image.length) {
//     /** 处理文本 */
//     if (text.length) list.push(textFn())
//     /** 处理图片 */
//     image.map(i => list.push(imageFn(i)))
//     await Promise.all(list)
//   } else {
//     await Promise.all(list)
//   }

//   if (buttons.length) {
//     const rows: { buttons: Array<ButtonType> }[] = []
//     buttons.forEach(v => {
//       const button = karinCommon.buttonToQQBot(v)
//       rows.push(...button)
//     })

//     keyboard = { content: { rows: [...rows] } }
//   }

//   if (markdown.length) {
//     markdown.sort((a, b) => a.index - b.index)
//     await Promise.all(markdown.map(async (v, index) => {
//       const opt = bot.super.buildTplMarkdown(v.custom_template_id, v.params, keyboard, message_id, ++seq)
//       send_list.push({ index: v.index, opt })
//     }))
//   }

//   if (imgs.length) {
//     imgs.sort((a, b) => a.index - b.index)
//     /** 取第一个 */
//     const { url, width, height } = imgs[0]
//     params.push({ key: bot.markdown.oldTemplate.imgDescKey, values: [`img #${width}px #${height}px`] })
//     params.push({ key: bot.markdown.oldTemplate.imgUrlKey, values: [url] })

//     /** 去除第一个 */
//     imgs.shift()
//     send_list.push({ index: -1, opt: bot.super.buildTplMarkdown(bot.markdown.templateId, params, keyboard, message_id, ++seq) })

//     /** 剩下的构建为单独的md */
//     await Promise.all(imgs.map(async img => {
//       const { url, width, height } = img
//       const params: Params = []
//       params.push({ key: bot.markdown.oldTemplate.imgDescKey, values: [`img #${width}px #${height}px`] })
//       params.push({ key: bot.markdown.oldTemplate.imgUrlKey, values: [url] })
//       send_list.push({ index: img.index, opt: bot.super.buildTplMarkdown(bot.markdown.templateId, params, keyboard, message_id, ++seq) })
//     }))
//   } else {
//     params.length && send_list.push({ index: -1, opt: bot.super.buildTplMarkdown(bot.markdown.templateId, params, keyboard, message_id, ++seq) })
//   }

//   /** 并发发送 */
//   await Promise.all(send_list.map(async (v, index) => {
//     index !== 0 && await new Promise(resolve => setTimeout(resolve, index * 100))
//     const res = await bot.super.sendMessage(openid, type, v.opt)
//     result.raw_data.push(res)
//   }))

//   result.message_id = result.raw_data[0].id
//   result.message_time = result.raw_data[0].time
//   return result
// }

// /**
//  * 原生markdown
//  */
// export async function markdownRaw (Opt: {
//   bot: AdapterQQBot,
//   data: Array<KarinElement>,
//   type: PathType,
//   openid: string,
//   message_id?: string,
// }) {
//   const { bot, data, type, openid, message_id } = Opt
//   /** 待发送列表 */
//   const send_list: { index: number, opt: SendMessageOptions }[] = []

//   let seq = common.random(1, 999999)
//   const list: Promise<void>[] = []
//   const result: ReplyReturn = {
//     message_id: '',
//     message_time: 0,
//     raw_data: [],
//   }

//   let keyboard: RawKeyboardType | undefined
//   const buttons: Array<ButtonElement | KeyBoardElement> = []
//   const message: Array<{ index: number, data: string }> = []
//   const markdown_tpl: Array<{ index: number, data: TplMarkdownElement }> = []

//   const imageFn = async (index: number, data: ImageElement) => {
//     const { url, width, height } = await handler.call('qqbot.files', { file: data.file, type: 'image', name: '0.png' })
//     message.push({ index, data: `![img #${width}px #${height}px](${url})` })
//   }

//   /** 富媒体消息直接发送 无需和正常消息走 */
//   const mediaFn = async (file: string, type: PathType, name: string, FileType: FileType) => {
//     const { url } = await handler.call('qqbot.files', { file, type, name })
//     const { file_info } = await bot.super.uploadMedia(openid, type, url, FileType)
//     const opt = bot.super.buildMedia(file_info, message_id, ++seq)
//     const res = type === PathType.Channels ? await bot.super.sendChannelText(openid, opt as SendChannelMessageOptions) : await bot.super.sendMessage(openid, type, opt)
//     result.raw_data.push(res)
//   }

//   await Promise.all(data.map(async (data, index) => {
//     switch (data.type) {
//       case 'text': {
//         /** 先提取掉url 随后放出按钮中 */
//         const res = Common.textToButton(data.text)
//         buttons.push(...res.button)
//         const text = type === PathType.Friends ? Common.formatText(res.text, true) : Common.formatText(res.text)
//         message.push({ index, data: text })
//         break
//       }
//       case 'image':
//         imageFn(index, data)
//         break
//       case 'at': {
//         if (type === PathType.Friends) break
//         message.push({ index, data: `<qqbot-at-user id="${data.uid || data.uin}" />` })
//         break
//       }
//       case 'record': {
//         const file = await common.voiceToSilk(data.file)
//         list.push(mediaFn(file, type, '0.silk', FileType.Record))
//         break
//       }
//       case 'video': {
//         list.push(mediaFn(data.file, type, '0.mp4', FileType.Video))
//         break
//       }
//       case 'file': {
//         /** 判断是不是一个本地路径 */
//         let ext = Date.now() + ''
//         if (path.isAbsolute(data.file)) ext = Date.now() + path.extname(data.file)
//         list.push(mediaFn(data.file, type, ext, FileType.File))
//         break
//       }
//       case 'button': {
//         buttons.push(data)
//         break
//       }
//       case 'keyboard': {
//         buttons.push(data)
//         break
//       }
//       case 'markdown': {
//         message.push({ index, data: data.content })
//         break
//       }
//       // 原生下发模板多少有点问题...
//       case 'markdown_tpl': {
//         markdown_tpl.push({ index, data })
//         break
//       }
//       default:
//         break
//     }
//   }))

//   await Promise.all(list)

//   if (buttons.length) {
//     const rows: { buttons: Array<ButtonType> }[] = []
//     buttons.forEach(v => {
//       const button = karinCommon.buttonToQQBot(v)
//       rows.push(...button)
//     })

//     keyboard = { content: { rows: [...rows] } }
//   }

//   if (markdown_tpl.length) {
//     await Promise.all(markdown_tpl.map(async (v, index) => {
//       const opt = bot.super.buildTplMarkdown(v.data.custom_template_id, v.data.params, keyboard, message_id, ++seq)
//       send_list.push({ index: v.index, opt })
//     }))
//   }

//   if (message.length) {
//     message.sort((a, b) => a.index - b.index)
//     send_list.push({ index: -1, opt: bot.super.buildRawMarkdown(message.map(v => v.data).join(''), keyboard, message_id, ++seq) })
//   }

//   /** 并发发送 */
//   await Promise.all(send_list.map(async (v, index) => {
//     index !== 0 && await new Promise(resolve => setTimeout(resolve, index * 100))
//     if (type === PathType.Channels) {
//       const res = await bot.super.sendChannelText(openid, v.opt as SendChannelMessageOptions)
//       result.raw_data.push(JSON.parse(res.body))
//     } else {
//       const res = await bot.super.sendMessage(openid, type, v.opt)
//       result.raw_data.push(res)
//     }
//   }))

//   result.message_id = result.raw_data[0].id
//   result.message_time = result.raw_data[0]?.time || result.raw_data[0]?.timestamp
//   return result
// }
