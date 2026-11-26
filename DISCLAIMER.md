# 免责声明 / Disclaimer

> 使用 pojia 即表示你已阅读并接受以下条款。

## 1. 性质
pojia 是本地、非商业、仅供学习研究的 Agent 人设编排工具。它把人设文本写入你本机的 codex / claude code 等配置，改变模型行为。它不是安全产品，不提供对第三方系统的攻击能力；内置破甲人设仅用于你有权管理的环境。

## 2. 合法与授权
仅在自己有权管理的主机、账号、数据上使用；对第三方系统的任何操作须取得明确书面授权；遵守适用法律法规及模型/宿主服务条款。严禁未授权访问、攻击、数据窃取、破坏或黑灰产牟利。

## 3. 非商业
CC BY-NC-SA 4.0，严禁售卖、付费下载、付费代部署/咨询/培训、付费门槛、隐瞒来源的再分发。违反即授权自动终止。

## 4. 风险自担 / 不担保
按“原样”提供，无任何保证。改写人设可能改变模型行为、移除宿主安全说明；配置写入可能与未来版本不兼容。使用前请备份配置并在隔离环境测试，后果自负。作者与贡献者在法律允许范围内不承担任何责任。

## 5. 配置与数据
apply 会修改 `~/.codex/config.toml` 与 `~/.claude/CLAUDE.md`（可用 CODEX_HOME / CLAUDE_CONFIG_DIR 指向隔离目录）。revert 可从 `.pojia-bak` 恢复。人设随请求发送给模型服务；请勿在提示词中放密钥或个人信息。不提供网络隔离或 DLP。

## 6. 第三方
内置破甲人设源自富江破甲 / Minglink（CC BY-NC-SA 4.0 + 附加条款）。本项目与 DeepSeek、OpenAI、Anthropic 及任何模型服务商无隶属或背书关系。署名见 NOTICE。

---

English summary: pojia is a local, non-commercial learning tool that writes persona text into your own agent configs. Use only on systems you are authorized to manage. No commercial use. AS IS, no warranty, you bear all consequences. Back up configs before use. See NOTICE for third-party attribution.
