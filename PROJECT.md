# AI 额度小组件 — iPhone 桌面卡片实时监控 Claude Code + Codex

## 一、项目背景

重度使用 Claude Code 和 OpenAI Codex CLI（各 $20/月订阅），最焦虑的是**当前 5 小时滚动窗口还能不能继续猛写代码**。现有查看方式分散且打断流程（CC 跑长任务不能打断、人不在电脑前也想知道额度）。

**目标**：iPhone 桌面/负一屏小组件卡片，左滑/打开**直接看到** Claude 和 Codex 各自的额度，无需点进去手动刷新。

## 二、需求收敛（最终）

- **纯手机本地**：零服务器、零费用、不买硬件、不需要 Apple 开发者账号（$99）
- **形态**：iPhone 原生小组件（用 **Scriptable** 免费 App 的 JS 写）
- **显示**：5小时剩余%、本周剩余%、今日 token 总额 —— Claude / Codex 各一份
- **Mac 关机也能用**：手机 24h 开机，手机侧直接调接口
- **Apple Watch**：暂不做（Scriptable 不支持 Watch 表盘）
- **刷新**：iOS 调度，打开时显示最近缓存（不强求秒级，符合"打开看一下即可"）

## 三、数据来源（调研结论）

两个平台额度百分比均来自**社区逆向的非官方 OAuth 接口**，Scriptable 跑在手机上非浏览器、无 CORS 限制，可用 token 直接调：

| 数据 | 接口 | 认证 | Mac关机可用 |
|------|------|------|-----------|
| Claude 5h%/周% + 重置 | `GET https://api.anthropic.com/api/oauth/usage` | `~/.claude/.credentials.json` OAuth token | ✅ |
| Codex 5h%/周% + 重置 | `GET https://chatgpt.com/backend-api/wham/usage` | `~/.codex/auth.json` access_token | ✅ |

参考开源实现：`steipete/CodexBar`、`f-is-h/Usage4Claude`、`ohugonnot/claude-code-statusline`。

### ⚠️ 两个待验证风险
1. **接口非官方**：随时可能变更；`/api/oauth/usage` 已知有限流（429），刷新间隔设 10-15 分钟。
2. **「今日 token 总额」是否拿得到**：百分比接口不一定返回 token 计数。本地计数（Claude `stats-cache.json`、Codex `state_5.sqlite.tokens_used`）在 Mac 上，纯手机+Mac关机场景可能拿不到。执行第一步 curl 实测确认；拿不到则改为近似或暂时去掉，5h% 本身已反映今日消耗强度。

## 四、认证与 token 处理

- **一次性引导**：从 Mac 拷 token 到手机
  - Codex：`~/.codex/auth.json` → `tokens.access_token` / `tokens.refresh_token` / `account_id`
  - Claude：`~/.claude/.credentials.json` → OAuth access/refresh token
  - 首次运行粘贴进脚本，存入 **Scriptable Keychain**，不明文落盘
- **自动续期**：access_token 过期时用 refresh_token 调各自 OAuth token 端点刷新（借鉴 CodexBar）

## 五、小组件实现（Scriptable）

- 单个 `.js` 脚本，iOS **中号组件**
- 布局：**双列对比**（左 Claude / 右 Codex），各三行：5小时条+%、本周条+%、今日 token；顶部标题 + "X分钟前"时间戳
- `ListWidget` + `DrawContext` 画圆角进度条；Claude 暖色 / Codex 青绿；系统字体
- 视觉层与数据层解耦：用户 Claude Design 设计稿到位后只换绘制部分
- `refreshAfterDate` 设 10-15 分钟；拉取失败显示上次缓存 + 离线标记

参考结构：
```
┌─────────────────────────────────┐
│ AI 额度              ⟳ 2分钟前    │
├────────────────┬────────────────┤
│ Claude         │ Codex          │
│ 5h ▓▓▓▓▓░░ 73% │ 5h ▓▓▓▓▓▓░ 85% │
│ 周 ▓▓░░░░░ 13% │ 周 ▓▓▓░░░░ 28% │
│ 今日 1.2M      │ 今日 662K      │
└────────────────┴────────────────┘
```

## 六、文件结构
```
ai-quota-widget/
├── CLAUDE.md            项目规则（含"边做边同步更新文档"机制）
├── PROJECT.md           项目设计文档（本文件，持续维护）
├── PROGRESS.md          执行清单 + 状态 + 进度日志
├── README.md            安装步骤 + 截图（portfolio 核心）
├── ai-quota-widget.js   Scriptable 主脚本
└── SETUP.md             一次性 token 引导说明
```

## 七、验证方式（端到端）
- 接口实测 JSON ↔ Claude/Codex 客户端 Settings 百分比一致
- 手机负一屏组件打开即显示，无需手动刷新
- 关 Mac 后等刷新周期，组件仍能更新（证明 Mac-off 可用）
- token 过期场景：自动刷新成功，组件不报错

## 八、Portfolio 包装
**项目名**：`AI Quota Widget` — 一眼看清 Claude Code + Codex 还能写多久
**卖点**：识别 AI 重度用户「额度焦虑」真痛点 → 零成本（不付费/不买硬件/不依赖 Mac）→ Scriptable 原生组件 → 跨双平台统一视图。体现 AI PM 的产品洞察 + 用 AI 自己造工具的执行力。
