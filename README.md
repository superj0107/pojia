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
pojia apply [通道|all]       把当前人设投放到宿主（默认 all）
pojia revert [通道|all]      撤销投放，恢复原配置
pojia doctor                 环境自检（含 roadmap/excluded）

pojia validate list                   列出有效性探针
pojia validate record <id> <pass|fail|skip> [备注]
pojia validate report                 命中率报告
pojia validate clear
```

## 通道矩阵（13 个已实现）

| 通道 | 落点 | 生效层 | 状态 |
|---|---|---|---|
| codex | `config.toml` 的 `model_instructions_file` | system | 本机实测 |
| claude | `CLAUDE.md` managed block + sys 文件 | user/sys | 本机实测 |
| grok | `~/.grok/AGENTS.md` | 用户层，启动读一次 | 未实测（本机无 grok） |
| hermes | `HERMES_HOME/SOUL.md` | 会话首轮 | 未实测（续会话不生效） |
| antigravity | 全局 `AGENTS.md` | always_on | agent-purge 实测可用，本机未装 |
| kilo | XDG kilo `AGENTS.md` | 用户层 | 未实测 |
| zcode | `~/.zcode/config.toml` 键 | system | 未实测（CLI 可能拿不到） |
| workbuddy | 插件缓存 `workbuddy-prompt.tpl` | system | 落点存在，需重启 WorkBuddy |
| qwen / qoder / kimi / kiro / codebuddy | 生成 `pojia-<name>` 启动器 + 启动参数 | system | 用包装器启动才生效 |

**Roadmap（未实现，因为 sys 层要装插件扩展 hook，工程量大）**：opencode、pi / pi-desktop、omp、crush。
**明确排除（无 system 入口）**：continue、auggie、goose；qwen/qoder/kiro/kimi 的常驻配置无 sys 入口，只走启动 shim。
DSH 走姊妹项目 [dsh-pojia](https://github.com/superj0107/dsh-pojia)。

通道目录隔离：可用 `CODEX_HOME`、`CLAUDE_CONFIG_DIR`、`GROK_HOME`、`HERMES_HOME`、`ZCODE_HOME`、`XDG_CONFIG_HOME` 指向测试目录，不碰真实配置。数据目录用 `POJIA_HOME`（默认 `~/.pojia`）。

**注意**：`apply all` 会写所有通道（含未实测的），建议先 `pojia status` 看清落点，对真实环境用具体通道名。codex 若被其他工具接管，`revert` 从 `.pojia-bak` 恢复覆盖前的值。

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

9 个测试覆盖人设增删改查、通道注册表完整性、ruleFile/tomlKey/shim 三类通道 apply/revert、codex/claude 写恢复、验证记录。

## 许可与署名

整体 **CC BY-NC-SA 4.0**（[LICENSE](./LICENSE)），非商业。内置破甲人设源自富江破甲 / Minglink（[FUJIANG-LICENSE.txt](./FUJIANG-LICENSE.txt)）。完整署名见 [NOTICE](./NOTICE)。免责见 [DISCLAIMER.md](./DISCLAIMER.md)。
