import nacl from 'tweetnacl'

/**
 * 从 secret 生成密钥对（不足 32 字节循环填充）
 */
export const generateKeyPair = (seed: string) => {
  let finalSeed = seed
  while (finalSeed.length < 32) finalSeed = finalSeed.repeat(2)
  finalSeed = finalSeed.slice(0, 32)
  const seedBuffer = Buffer.from(finalSeed, 'utf-8')
  return nacl.sign.keyPair.fromSeed(seedBuffer)
}

/**
 * 用 secret 对 eventTs + plainToken 签名（hex 编码）
 */
export const sign = (secret: string, eventTs: string, plainToken: string): string => {
  const { secretKey } = generateKeyPair(secret)
  const messageBytes = Buffer.from(eventTs + plainToken, 'utf-8')
  const signature = nacl.sign.detached(messageBytes, secretKey)
  return Buffer.from(signature).toString('hex')
}

/**
 * 验证 webhook 推送签名（ed25519）
 * @param secret 机器人密钥
 * @param timestamp x-signature-timestamp 头
 * @param rawBody 原始 body 字符串
 * @param ed25519Hex x-signature-ed25519 头
 */
export const verifySignature = (
  secret: string,
  timestamp: string,
  rawBody: string,
  ed25519Hex: string
): boolean => {
  const expected = sign(secret, timestamp, rawBody)
  return expected === ed25519Hex
}
