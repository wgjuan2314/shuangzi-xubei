# 项目规则 — AI 额度小组件

## 文档同步机制（重要）
- **每完成执行清单中一项，必须同步更新 `PROJECT.md` 与 `PROGRESS.md`**（任务状态 + 当日进展），保持文档与代码一致
- 重要决策、接口字段变更、踩坑结论都要落到 PROJECT.md

## 开发规范
- 主脚本用 JavaScript（Scriptable 运行环境），代码注释用中文
- 精准修改：只碰必须碰的，不重构没坏的东西
- 简洁优先：用最少代码解决问题，不做未要求的灵活性
- 每完成一个模块自动 git commit，commit 信息用中文

## 安全
- token（Claude / Codex OAuth）一律存 Scriptable Keychain，不明文写入脚本或仓库
- 仓库 .gitignore 排除任何含真实 token 的本地文件
