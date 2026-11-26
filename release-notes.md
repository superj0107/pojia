# 0.1.0

pojia v0.1.0 首发：一份人设，多宿主投放。

- 13 个宿主通道（codex / claude 本机实测，其余按配置约定实现，未实测的已在 doctor 标明）
- 统一人设库（frontmatter 格式，兼容 dsh-pojia）+ 有效性验证探针
- Windows 一键 bat 脚本（安装/注入/回滚/卸载/检查）
- macOS/Linux install.sh + uninstall.sh + .command 双击脚本
- CI 跑语法检查、18 个自动化测试、安装脚本冒烟测试
- 对抗性审查 7 项修复（TOML 转义、revert 保改动、路径穿越防护等）
- CC BY-NC-SA 4.0，非商用；富江破甲署名与 DISCLAIMER 完整
