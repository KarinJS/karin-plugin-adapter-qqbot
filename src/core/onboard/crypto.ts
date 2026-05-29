import crypto from 'node:crypto'

/**
 * 生成 256-bit 随机 AES 密钥（base64）
 */
export const generateBindKey = (): string =>
  crypto.randomBytes(32).toString('base64')

/**
 * 解密 bot_encrypt_secret（AES-256-GCM）
 *
 * 密文布局：IV (12 bytes) || ciphertext (N bytes) || AuthTag (16 bytes)
 */
export const decryptSecret = (encryptedBase64: string, keyBase64: string): string => {
  const key = Buffer.from(keyBase64, 'base64')
  if (key.length !== 32) {
    throw new Error(`AES key length must be 32 bytes, got ${key.length}`)
  }

  const raw = Buffer.from(encryptedBase64, 'base64')
  const iv = raw.subarray(0, 12)
  const ciphertext = raw.subarray(12, raw.length - 16)
  const authTag = raw.subarray(raw.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(ciphertext, undefined, 'utf8')
  plaintext += decipher.final('utf8')
  return plaintext
}
