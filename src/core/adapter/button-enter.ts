import type { ButtonElement, KarinButton, KeyboardElement, QQBotButton } from 'node-karin'

/** QQ 私聊直发文本链标签。 */
const COMMAND_ENTER_TEXT_CHAIN_REGEXP = /<\s*qqbot-cmd-enter\b/i

/**
 * 判断按钮是否是 `enter: true` 指令按钮。
 *
 * 链接按钮和回调按钮有自己的平台行为，只有普通指令按钮才需要提示
 * `enter: true` 在非私聊场景不生效。
 *
 * @param button Karin 按钮配置。
 * @returns 是否为直发指令按钮。
 */
export const isCommandEnterButton = (button: KarinButton): boolean => {
  if (button.link || button.callback) return false
  const type = button.type ?? 2
  return type === 2 && button.enter === true
}

/**
 * 判断 markdown 内容是否手写了 QQ 私聊直发文本链。
 *
 * @param markdown markdown 内容。
 * @returns 是否包含 `<qqbot-cmd-enter ...>`。
 */
export const hasCommandEnterTextChain = (markdown: string): boolean => {
  return COMMAND_ENTER_TEXT_CHAIN_REGEXP.test(markdown)
}

/**
 * 收集 button/keyboard 中所有 `enter: true` 指令按钮。
 *
 * @param buttons 单行按钮元素列表。
 * @param keyboards 多行 keyboard 元素列表。
 * @returns 需要特殊处理的直发指令按钮。
 */
export const collectCommandEnterButtons = (
  buttons: ButtonElement[],
  keyboards: KeyboardElement[]
): KarinButton[] => {
  const result: KarinButton[] = []

  buttons.forEach(element => {
    element.data.forEach(button => {
      if (isCommandEnterButton(button)) result.push(button)
    })
  })

  keyboards.forEach(element => {
    element.rows.forEach(row => {
      row.forEach(button => {
        if (isCommandEnterButton(button)) result.push(button)
      })
    })
  })

  return result
}

/**
 * 归一 QQ keyboard 按钮字段。
 *
 * @param button node-karin 转换后的 QQBot 按钮。
 * @param id 当前 keyboard 内唯一按钮序号。
 * @returns 可直接放入 QQ 官方 keyboard 的按钮对象。
 */
export const normalizeQQBotButton = (button: QQBotButton, id: number): QQBotButton => {
  return {
    ...button,
    id: String(id),
  }
}

/**
 * 生成直发按钮不支持提示中的按钮名称列表。
 *
 * @param buttons 直发指令按钮列表。
 * @returns 便于写入日志的按钮名称。
 */
export const formatCommandEnterButtonNames = (buttons: KarinButton[]): string => {
  return buttons
    .map(button => button.text || button.data || '未命名按钮')
    .join('、')
}
