/**
 * intent bit -> 名称（中英双语）
 */
export const intentBitMap: Record<number, string> = {
  [1 << 0]: 'GUILDS               (频道生命周期)',
  [1 << 1]: 'GUILD_MEMBERS        (频道成员变更)',
  [1 << 9]: 'GUILD_MESSAGES       (频道消息-私域)',
  [1 << 12]: 'DIRECT_MESSAGE       (频道私信)',
  [1 << 24]: '群成员进退群事件',
  [1 << 25]: 'GROUP_AND_C2C_EVENT (群聊/单聊消息)',
  [1 << 26]: 'INTERACTION          (按钮交互回调)',
  [1 << 30]: 'PUBLIC_GUILD_MESSAGES (频道消息-公域)',
}

/** 优先级从高到低，回退时从最前面剥离 */
export const priorityIntents: number[] = [
  1 << 1,   // GUILD_MEMBERS
  1 << 9,   // GUILD_MESSAGES（私域）
  1 << 30,  // PUBLIC_GUILD_MESSAGES（公域）
  1 << 12,  // DIRECT_MESSAGE
  1 << 24,  // 群成员进退群
  1 << 26,  // INTERACTION（按钮回调）
  1 << 25,  // GROUP_AND_C2C_EVENT
  1 << 0,   // GUILDS
]

/**
 * 计算最大 intents（全部启用）
 */
export const computeMax = (): number =>
  priorityIntents.reduce((acc, bit) => acc | bit, 0)

/**
 * 在当前 intents 基础上去掉最高优先级的一位，得到回退值
 * 返回 0 表示已无可用 intent
 */
export const computeFallback = (current: number): number => {
  for (const bit of priorityIntents) {
    if (current & bit) return current & ~bit
  }
  return 0
}

/**
 * 将 intents 数值解析为可读名称列表
 */
export const formatIntentNames = (intents: number, prefix = ''): string => {
  const names: string[] = []
  for (const [bit, name] of Object.entries(intentBitMap)) {
    if (intents & Number(bit)) names.push(prefix + name)
  }
  return names.join('\n')
}
