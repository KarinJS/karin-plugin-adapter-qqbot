# demo

本目录存放**示例 / 烟测 app**，不会被 karin 自动加载（`package.json#karin.ts-apps`
指向 `src/apps`），不进入发布构建。

## qqtest.ts

QQBot 2.0 真号烟测 app。需要本地试用时，复制到 karin 项目的 `plugins/` 目录或
本仓库 `src/apps/` 目录均可：

```bash
# 临时启用
mkdir -p src/apps
cp demo/qqtest.ts src/apps/qqtest.ts

pnpm dev
```

在群里 / 私聊机器人发送：

```
#qqtest help     查看命令清单
#qqtest text     纯文本
#qqtest md       显式 markdown
#qqtest btn      markdown + 按钮（触发 INTERACTION_CREATE）
#qqtest image    单图
#qqtest urls     多 URL（验证 keyboard.enable）
#qqtest reply    引用回复
#qqtest recall   发一条后 3s 撤回
#qqtest event    打印事件 raw 关键字段
#qqtest who      打印发送者信息
```

完整测试矩阵见 [`docs/SMOKE-TEST.md`](../docs/SMOKE-TEST.md)。
