# pojia — 一份人设，多宿主投放

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=fff)](https://nodejs.org/)

> ⚠️ 使用前读 [免责声明](./DISCLAIMER.md)：仅学习研究、非商业、仅限有权管理的环境，后果自负。

`pojia` 是一个**全局多 Agent 人设与行为编排工具**：一份人设库，投放到本机多个 coding agent。第一版自带两个通道：**codex** 与 **claude code**，通道由本项目自行实现，不依赖 agent-purge。

姊妹项目 [dsh-pojia](https://github.com/superj0107/dsh-pojia) 专注 DeepSeek Harness 插件通道，二者独立分发、人设格式兼容。

## 安装

```sh
npm install -g pojia
# 或源码
git clone https://github.com/superj0107/pojia.git && cd pojia
npm link
```

需要 Node.js 18+。

## 用法

```sh
pojia persona list                    列出人设（内置破甲内核 + 你的）
pojia persona use <id>                切换当前人设
pojia persona show                    查看当前人设
pojia persona import <id> <正文>       导入人设
pojia persona delete <id>             删除人设

pojia status                          查看各通道状态
pojia apply [codex|claude|all]        把当前人设投放到宿主（默认 all）
pojia revert [codex|claude|all]       撤销投放，恢复原配置
pojia doctor                          环境自检

pojia validate list                   列出有效性探针
pojia validate record <id> <pass|fail|skip> [备注]
pojia validate report                 命中率报告
pojia validate clear
```

## 通道说明

| 通道 | 落点 | 生效层 | 备注 |
|---|---|---|---|
| codex | `~/.codex/config.toml` 的 `model_instructions_file` → `~/.pojia/injections/codex.md` | system | apply 前备份 config 为 `.pojia-bak`，revert 整体恢复 |
| claude | `~/.claude/CLAUDE.md` 的 managed block | 用户层 system-reminder | 不是 system 数组；sys 层另生成 `~/.pojia/injections/claude-system.md`，配合 `claude --system-prompt-file` 使用 |

通道目录隔离：可用 `CODEX_HOME`、`CLAUDE_CONFIG_DIR` 指向测试目录，不碰真实配置。数据目录用 `POJIA_HOME`（默认 `~/.pojia`）。

**注意**：如果 codex 已被其他工具（如 agent-purge）接管，`pojia apply codex` 会覆盖 `model_instructions_file`；`revert` 从 `.pojia-bak` 恢复覆盖前的值。请用隔离目录测试后再对真实环境执行。

## 人设格式

```
---
id: my-persona
name: 我的设定
description: 一句话说明
harness: ["*"]
model: ["*"]
order: 50
---
正文（真正注入的提示词）
```

用户人设在 `~/.pojia/personas/*.md`。内置 `pojia-armor` 是破甲内核（源自富江破甲，见 NOTICE）。

## 有效性验证

提示词效果跟模型版本走。`/validate` 提供固定探针，跑完记录 pass/fail，`report` 给出各人设命中率（skip 不计分母），用来比较"当前模型 + 当前人设"的真实效果。

## 测试

```sh
npm test
```

5 个测试覆盖人设增删改查、codex config 写/恢复、claude managed block 写/清除、验证记录。

## 许可与署名

整体 **CC BY-NC-SA 4.0**（[LICENSE](./LICENSE)），非商业。内置破甲人设源自富江破甲 / Minglink（[FUJIANG-LICENSE.txt](./FUJIANG-LICENSE.txt)）。完整署名见 [NOTICE](./NOTICE)。免责见 [DISCLAIMER.md](./DISCLAIMER.md)。
