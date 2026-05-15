# S12 · 发版自检清单

## 编译 / 静态检查

- [ ] `pnpm i` 无新增包冲突；
- [ ] `pnpm build` 通过（tsc + tsdown）；
- [ ] `pnpm eslint . --max-warnings 0`（如 CI 强制）通过；
- [ ] 无 `any` 残留在新写代码里（除 axios 第三方类型）；
- [ ] 类型 `Event` 联合在 dispatcher switch 中穷尽（TS noImplicitReturns 检查辅助）。

## 行为验证

- [ ] 真实账号收到新版 `GROUP_MESSAGE_CREATE`（含 mentions）；
- [ ] mentions.is_you=true 的消息能正确触发命令；
- [ ] 单聊收到新版 `C2C_MESSAGE_CREATE`（author.username 正确）；
- [ ] 发送：文本 / 文本+图 / 文本+视频 / 文本+按钮 / 引用回复 五条路径；
- [ ] 撤回：群、单聊、子频道、私信；
- [ ] INTERACTION_CREATE：群、单聊、频道场景各点 1 个按钮；
- [ ] WebSocket 断网 30s 后能 Resume 不丢消息；
- [ ] Webhook：op=13 签名校验回包；事件 ed25519 校验。

## 文档 / 元数据

- [ ] `CHANGELOG.md` 新增 2.0.0 段落；
- [ ] README 更新「Markdown / Keyboard 全量开放后的使用方式」；
- [ ] `package.json` version 2.0.0；
- [ ] CI 流水线检查通过（release-please / npm publish 流程）。

## 发布动作

1. 在 PR 合并到 `main` 后由 release-please 自动建 PR；
2. 合并 release PR；
3. 等待 CI 自动 `npm publish --access public`；
4. 在 Release Notes 中粘贴：
   - 破坏式变更清单；
   - 配置迁移指引（`markdown.mode` → `markdown.enable` + `keyboard.enable`）；
   - INTERACTION_CREATE 接入方式示例。

## 回滚预案

- 若 2.0.0 上线后出现严重 bug：
  1. `npm dist-tag add @karinjs/adapter-qqbot@1.3.1 latest` 回退；
  2. 在 main 分支 revert 受影响 commit；
  3. release-please 出 hotfix。
