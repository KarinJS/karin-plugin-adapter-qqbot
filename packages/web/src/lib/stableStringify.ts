/**
 * 深度比较时忽略对象键顺序。
 *
 * 服务端会重新格式化配置，字段顺序可能变化；直接 JSON.stringify 会把
 * 没有改动的草稿判定成 dirty。
 */
export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
