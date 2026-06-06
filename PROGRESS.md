# 执行进度

> 规则：每完成一项，更新本表状态 + 追加进度日志，并同步 PROJECT.md。

## 执行清单

| # | 任务 | 状态 |
|---|------|------|
| 1 | 初始化项目 + 落库文档（PROJECT/PROGRESS/CLAUDE.md） | ✅ 完成 |
| 2 | 验证 Claude + Codex 额度接口（curl 实测） | ✅ 完成 |
| 3 | 实现 token 自动刷新流程 | ✅ 完成（实现，活账号未实测） |
| 4 | 编写 Scriptable 小组件脚本 | ✅ 完成 |
| 5 | 手机部署 + 端到端验证 | ✅ 完成（组件已在手机显示） |
| 6 | 替换设计稿视觉层 | ✅ 完成（用户决定沿用当前视觉，不另出稿） |
| 7 | 写 README + 截图打包 portfolio | ✅ 完成（截图已入 docs/screenshot.png） |

**🎉 项目全部完成。**

状态图例：⬜ 待办 / 🔄 进行中 / ✅ 完成 / ⛔ 阻塞

## 进度日志

### 2026-06-06
- 创建项目目录 `/Users/suansuan/Documents/claude/ai-quota-widget/`，git init
- 落库 PROJECT.md / PROGRESS.md / CLAUDE.md
- ✅ 接口实测通过（均 HTTP 200）：
  - Claude `oauth/usage`：`five_hour.utilization` / `seven_day.utilization`（已用%）+ `resets_at`
  - Codex `wham/usage`：`primary/secondary_window.used_percent` + `reset_at` + `plan_type`
  - token 来源：Claude 在 macOS Keychain `Claude Code-credentials`；Codex 在 `~/.codex/auth.json`
- ⚠️ 结论：两接口都**不返回今日 token 总额**，只有百分比+重置时间
- ✅ 用户决策：**去掉今日 token**，组件显示 5h%/周%/重置倒计时
- ✅ 写完 `ai-quota-widget.js`（认证+刷新+双接口拉取+缓存+双列渲染），node --check 语法通过
- ✅ 写完 `export-tokens.sh`（Mac 导出 token JSON），实测能正确读出两边 token
- ✅ 写完 SETUP.md / README.md
- ⚠️ token 刷新逻辑已实现，但**未在活账号实测**（调 refresh 会轮换 token，可能影响 Mac 上正在用的登录）；手机端 token 自然过期时会被验证，失败则重新导入
- ✅ 手机端到端跑通：iCloud 同步脚本 → 通用剪贴板传 token → 运行导入成功 → 中号组件绑定脚本 → 桌面正常显示 Claude/Codex 两列额度
- ✅ 重置文案按用户反馈优化：5小时「20:30 恢复」、本周「6月12日 恢复」（比百分比+日期更直观）
- ✅ 用户决定沿用当前视觉，不另做设计稿；实际效果满意
- 待办：用户补一张组件截图放进 README/docs（portfolio 收尾）
