import nacl from 'tweetnacl'

/**
 * 从提供的种子生成密钥对
 * @param seed 用于生成密钥的种子
 */
export const generateKeyPair = (seed: string) => {
  let finalSeed = seed
  while (finalSeed.length < 32) {
    finalSeed = finalSeed.repeat(2) // 确保种子长度至少为32字节
  }
  finalSeed = finalSeed.slice(0, 32) // 截断为32字节
  const seedBuffer = Buffer.from(finalSeed, 'utf-8')
  const keyPair = nacl.sign.keyPair.fromSeed(seedBuffer)
  return keyPair
}

/**
 * 使用提供的私钥、事件时间戳和明文令牌对消息进行签名
 * @param privateKey 用于签名的私钥
 * @param eventTs 计算签名使用时间戳
 * @param plainToken 需要计算签名的字符串
 * @returns 生成的十六进制格式的签名
 */
export const signMessage = (
  privateKey: Uint8Array,
  eventTs: string,
  plainToken: string
) => {
  const message = eventTs + plainToken
  const messageBytes = Buffer.from(message, 'utf-8')
  const signature = nacl.sign.detached(messageBytes, privateKey)
  return Buffer.from(signature).toString('hex')
}

/**
 * 签名
 * @param secret 机器人密钥
 * @param eventTs 计算签名使用时间戳
 * @param plainToken 需要计算签名的字符串
 * @returns 生成的十六进制格式的签名
 */
export const sign = (
  secret: string,
  eventTs: string,
  plainToken: string
) => {
  const { secretKey } = generateKeyPair(secret)
  const signature = signMessage(secretKey, eventTs, plainToken)
  return signature
}
