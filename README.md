# AI Quota Widget

> 一眼看清 Claude Code + Codex 还能写多久 —— iPhone 桌面小组件，纯本地、零成本。

重度使用 Claude Code 和 OpenAI Codex 的人都有「额度焦虑」：当前这个 5 小时窗口还能不能继续猛写代码？跑长任务时不能打断去查、人不在电脑前也想知道。

**AI Quota Widget** 把两个平台的额度做成 iPhone 负一屏小组件，左滑即见，无需点开、无需刷新。

![widget](docs/screenshot.png)

## 特性
- **双平台统一视图**：Claude Code + Codex 的 5 小时 / 本周 剩余额度 + 重置倒计时
- **纯手机本地**：用 [Scriptable](https://scriptable.app/)（免费）写的原生组件，零服务器、零费用、无需 Apple 开发者账号
- **Mac 关机也能用**：手机侧直接调用各平台 OAuth 接口，token 存 iPhone Keychain
- **零打断**：进度条像电量条，剩余越少越红，一眼判断

## 数据来源
- Claude：`GET https://api.anthropic.com/api/oauth/usage`
- Codex：`GET https://chatgpt.com/backend-api/wham/usage`

均为社区逆向的非官方 OAuth 接口，仅用本机已登录的 token 调用。详见 [PROJECT.md](PROJECT.md)。

## 安装
见 [SETUP.md](SETUP.md)。三步：Mac 导出 token → 拷到手机 → Scriptable 运行一次导入，然后桌面加中号组件。

## 技术栈
Scriptable (JavaScript) · WidgetKit (中号组件) · iOS Keychain · OAuth token 自动续期

## 免责声明
所用接口为非官方逆向接口，仅供个人监控自己账号额度使用；平台调整可能导致失效。token 仅存于本机 Keychain，不上传任何第三方。
