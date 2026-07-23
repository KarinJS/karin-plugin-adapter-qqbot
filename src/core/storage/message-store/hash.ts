const FNV_OFFSET = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const MASK_64 = 0xffffffffffffffffn
/** 截断到 53 位，保证 hash 能安全放进 JS number 和 SQLite INTEGER。 */
const MASK_53 = 0x1fffffffffffffn

/**
 * 计算消息 ID 的 53 位 FNV-1a hash。
 *
 * QQ 的 `ROBOT1.0_...` / `REFIDX_...` ID 长达 50~90 字符；如果直接对 TEXT 建索引，
 * 每个索引条目都要完整复制一份 ID。改为对 hash 整数列建索引后，索引条目从
 * 几十字节降到 ~12 字节。查询命中后再比对原文，53 位空间下十万级数据的碰撞
 * 概率可以忽略。
 *
 * @param input 消息 ID 或引用索引原文。
 * @returns 53 位非负整数 hash。
 */
export const hashId = (input: string): number => {
  let hash = FNV_OFFSET
  for (let index = 0; index < input.length; index++) {
    hash ^= BigInt(input.charCodeAt(index))
    hash = (hash * FNV_PRIME) & MASK_64
  }
  return Number(hash & MASK_53)
}
