import { Http } from './http'

/** ack 返回码 */
export type AckCode = 0 | 1 | 2 | 3 | 4 | 5

/**
 * INTERACTION_CREATE 回应
 */
export class InteractionApi extends Http {
  /**
   * @param interactionId INTERACTION_CREATE 事件中的 id
   * @param code 0 成功 / 1 操作失败 / 2 操作频繁 / 3 重复操作 / 4 无权限 / 5 仅管理员
   */
  async ack (interactionId: string, code: AckCode = 0): Promise<void> {
    await this.put(`/interactions/${interactionId}`, { code })
  }
}
