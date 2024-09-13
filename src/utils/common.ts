import fs from 'fs'
import Jimp from 'jimp'
import qrcode from 'qrcode'
import { basename } from './dir'
import { encode, isSilk } from 'silk-wasm'
import lodash from 'node-karin/lodash'
import GetUrls from '@karinjs/geturls'
import { config, execs, logger, Common as karinCommon, segment, ButtonElement } from 'node-karin'
import path from 'path'

/**
 * 二维码返回参数
 */
export interface QRRes {
  /** 二维码base64 */
  base64: string
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
}

class Common extends karinCommon {
  /** ffmpeg */
  ffmpeg: string
  constructor () {
    super()
    this.ffmpeg = ''
    this.initFfmpeg()
  }

  random (min: number, max: number) {
    return lodash.random(min, max)
  }

  /**
   * 语音转silk
   * @param voice - 语音文件
   * @returns silk buffer
   */
  async voiceToSilk (voice: string): Promise<string> {
    if (!this.ffmpeg) throw TypeError('ffmpeg未安装，请安装 ffmpeg 或者 配置ffmpeg_path')
    const time = Date.now()
    const dir = `${process.cwd()}/temp/${basename}/${Date.now()}`
    let voicePath = dir

    /** 传入的是路径 则直接使用 */
    if (fs.existsSync(voice)) {
      const buffer = fs.readFileSync(voice)
      if (isSilk(buffer)) return Buffer.from(buffer).toString('base64')
      voicePath = path.resolve(voice)
    } else {
      /** 保存到本地 */
      const buffer = await this.buffer(voice)
      if (isSilk(buffer)) return Buffer.from(buffer).toString('base64')
      fs.writeFileSync(dir, buffer)
    }

    const pcmPath = `${dir}.pcm`
    const silkPath = `${dir}.silk`
    const command = `${this.ffmpeg} -i ${voicePath} -f s16le -ar 48000 -ac 1 ${pcmPath}`
    await execs(command)
    logger.info('pcm文件转换成功 开始转码为silk文件')

    const buffer = await fs.promises.readFile(pcmPath)
    const silk = await encode(buffer, 48000)
    logger.info(`silk文件转码成功 音频时长: ${logger.yellow(silk.duration + 'ms')} 转码耗时: ${logger.yellow(Date.now() - time + 'ms')}`)
    /** dev模式下生成silk文件并保留 */
    if (process.env.karin_app_mode === 'dev') {
      await fs.promises.writeFile(silkPath, Buffer.from(silk.data))
      logger.info(`silk文件已生成: ${logger.yellow(silkPath)}`)
    } else {
      /** 非dev删除文件 */
      fs.promises.unlink(voicePath)
      fs.promises.unlink(pcmPath)
    }

    return Buffer.from(silk.data).toString('base64')
  }

  /**
   * 初始化ffmpeg
   */
  async initFfmpeg () {
    try {
      /** 环境变量 */
      await execs('ffmpeg -version')
      this.ffmpeg = 'ffmpeg'
    } catch {
      /** 环境变量没有读配置 */
      const ffmpeg_path = config.Config.ffmpeg_path
      if (!ffmpeg_path) return logger.error(logger.red('ffmpeg未安装，请安装 ffmpeg 或者 配置ffmpeg_path'))
      /** 检查文件是否存在 */
      if (!fs.existsSync(ffmpeg_path)) return logger.error(logger.red('ffmpeg_path配置错误，请检查文件是否存在'))
      this.ffmpeg = `"${ffmpeg_path}"`
    }
  }

  /**
   * 处理URL
   * @param url - URL
   * @param exclude - 排除的URL
   */
  getUrls (url: string, exclude = []) {
    /** 中文不符合url规范 */
    url = url.replace(/[\u4e00-\u9fa5]/g, '|')
    const urls = GetUrls.getUrls(url, {
      exclude,
      /** 去除 WWW */
      stripWWW: false,
      /** 规范化协议 */
      normalizeProtocol: false,
      /** 移除查询参数 */
      removeQueryParameters: false,
      /** 移除唯一斜杠 */
      removeSingleSlash: false,
      /** 查询参数排序 */
      sortQueryParameters: false,
      /** 去除认证信息 */
      stripAuthentication: false,
      /** 去除文本片段 */
      stripTextFragment: false,
      /** 移除末尾斜杠 */
      removeTrailingSlash: false,
      /** 不进行标准处理url */
      normalize: false,
    })

    return urls
  }

  /**
   * 传入URL数组，转为二维码base64
   * @param urls - URL数组
   */
  async getQrCode (urls: string[]): Promise<QRRes> {
    const list = await Promise.all(urls.map(url => qrcode.toDataURL(url)))

    /** 转为jimp图像对象 */
    const Jimps = await Promise.all(list.map(url => {
      return Jimp.read(Buffer.from(url.split(',')[1], 'base64'))
    }))

    /** 获取最长的宽高 */
    const QRwidth = lodash.max(Jimps.map(j => j.bitmap.width)) || Jimps[0].bitmap.width
    const Qrheight = lodash.sum(Jimps.map(j => j.bitmap.height))

    /** 空白区域高度 */
    const padding = 0

    /** 二维码图像加上文字 */
    const qrImagesWithText = await Promise.all(
      Jimps.map(async (qrImage) => {
        /** 增加空白区域 */
        const newImage = new Jimp(QRwidth, Qrheight + padding, 0xffffffff)
        /** 将二维码图像放在空白区域下方 */
        newImage.composite(qrImage, 0, padding)
        return newImage
      })
    )

    /** 动态计算每行二维码的数量 */
    const qrPerRow = Math.ceil(Math.sqrt(urls.length))

    /** 计算总行数和合并后图像的总宽度和总高度 */
    const totalRows = Math.ceil(qrImagesWithText.length / qrPerRow)
    const combinedWidth = QRwidth * qrPerRow
    const combinedHeight = (Qrheight + padding) * totalRows

    /** 创建合并后的图像对象 */
    const combinedQRImage = new Jimp(combinedWidth, combinedHeight, 0xffffffff)

    /** 将二维码图像合并到合并后的图像对象中 */
    qrImagesWithText.forEach((qrImage, index) => {
      const x = (index % qrPerRow) * QRwidth
      const y = Math.floor(index / qrPerRow) * (Qrheight + padding)
      combinedQRImage.composite(qrImage, x, y)
    })

    /** 转为base64 */
    const base64 = await combinedQRImage.getBase64Async(Jimp.MIME_PNG)

    /** 宽高 */
    const width = combinedQRImage.bitmap.width
    const height = combinedQRImage.bitmap.height

    return {
      base64,
      width,
      height,
    }
  }

  /**
   * 传入文本 返回处理后的文本、图片
   * @param text - 文本
   */
  async getQQBotText (text: string): Promise<{
    /** 处理后的文本 */
    text: string
    /** 二维码数据 */
    data?: QRRes
  }> {
    const urls = this.getUrls(text)
    const data = urls.length ? (await this.getQrCode(urls)) : undefined

    /** 使用for循环来替换字符串 保证一致性 */
    for (const url of urls) {
      text = text.replace(url, '[请扫码查看]')
    }
    return {
      text,
      data,
    }
  }

  /**
   * 传入文本 处理文本 返回的按钮为多行按钮
   * @param text - 文本
   */
  textToButton (text: string) {
    const urls = this.getUrls(text)
    const button: ButtonElement[] = []

    /** 使用for循环来替换字符串 保证一致性 */
    for (const url of urls) {
      text = text.replace(url, '[请点击按钮查看]')
      button.push(segment.button({ text: url, link: url }))
    }

    return {
      text,
      button,
    }
  }

  /**
   * 传入文本 将文本一些特殊字符转义去除 用于处理markdown
   * @param text - 文本
   * @param isC2C - 是否是C2C
   * @returns 处理后的文本
   */
  formatText (text: string, isC2C = false) {
    text = text.replace(/everyone/g, '').replace(/\n/g, '\r')
    if (isC2C) text = text.replace(/<qqbot-at-user id=".+" \/>/gm, '').replace(/<@.+>/gm, '')
    return text
  }
}

export const common = new Common()
