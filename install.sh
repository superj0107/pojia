#!/usr/bin/env bash
# =============================================================================
# pojia 一键安装 / 卸载 — macOS / Linux / WSL（全局 CLI，一份人设多宿主投放）
#
# 用法（在解压后的目录里）：
#   bash install.sh                 # 从当前源码 npm link 安装 pojia CLI
#   bash install.sh --yes           # 缺 Node.js/npm 时免交互尝试安装
#   bash install.sh --no-deps       # 缺依赖只警告，不装
#   bash install.sh --uninstall     # 卸载 CLI（人设与注入文件保留在 ~/.pojia）
#   bash install.sh --help
#
# 环境变量：POJIA_HOME 数据目录（默认 ~/.pojia）；POJIA_NO_SEARCH=1 只在 PATH 找 node。
# 安装后：pojia doctor 自检；pojia apply codex / pojia apply claude 投放。
# =============================================================================
set -euo pipefail

src_dir="$(cd "$(dirname "$0")" && pwd -P)"
assume_yes=0
no_deps=0
do_uninstall=0

c_ok=$'\033[32m'; c_warn=$'\033[33m'; c_err=$'\033[31m'; c_cyan=$'\033[36m'; c_off=$'\033[0m'
if [ ! -t 1 ]; then c_ok=""; c_warn=""; c_err=""; c_cyan=""; c_off=""; fi
step() { printf '\n%s==> %s%s\n' "$c_cyan" "$*" "$c_off"; }
ok()  { printf '    %s[OK]%s %s\n' "$c_ok" "$c_off" "$*"; }
warn() { printf '    %s[!]%s %s\n' "$c_warn" "$c_off" "$*"; }
err()  { printf '    %s[X]%s %s\n' "$c_err" "$c_off" "$*" >&2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --yes) assume_yes=1 ;;
    --no-deps) no_deps=1 ;;
    --uninstall) do_uninstall=1 ;;
    -h|--help) sed -n '2,/^# ===/p' "$src_dir/install.sh" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) err "未知参数：$1"; exit 2 ;;
  esac
  shift
done

find_node() {
  if [ -n "${POJIA_NODE:-}" ]; then
    [ -x "$POJIA_NODE" ] && printf '%s' "$POJIA_NODE"
    return 0   # 显式指定优先；无效就当没 node，不再回退 PATH
  fi
  if [ "${POJIA_NO_SEARCH:-0}" != 1 ]; then
    for d in "$HOME"/.dsh/dsh-runtimes/*/dependencies/node/bin/node; do
      [ -x "$d" ] && { printf '%s' "$d"; return; }
    done
  fi
  command -v node 2>/dev/null || true
}

node_bin="$(find_node)"
npm_bin=""
if [ -n "$node_bin" ]; then
  npm_bin="$(dirname "$node_bin")/npm"
  [ -x "$npm_bin" ] || npm_bin="$(dirname "$node_bin")/npm.cmd"
  [ -x "$npm_bin" ] || npm_bin="$(command -v npm 2>/dev/null || true)"
fi

if [ "$do_uninstall" = 1 ]; then
  step "卸载 pojia CLI"
  if [ -n "$npm_bin" ]; then "$npm_bin" uninstall -g pojia 2>/dev/null || true; fi
  ok "CLI 已卸载；人设与注入文件保留在 ${POJIA_HOME:-$HOME/.pojia}"
  exit 0
fi

step "检查依赖"
if [ -z "$node_bin" ]; then
  if [ "$no_deps" = 1 ]; then
    warn "没找到 Node.js；按要求跳过依赖安装。pojia 需要 Node.js 18+。"
    exit 0
  fi
  if [ "$assume_yes" = 1 ]; then
    err "没找到 Node.js 且无法自动安装（请手动安装 https://nodejs.org）"; exit 2
  fi
  err "没找到 Node.js 18+，请先安装：https://nodejs.org"; exit 2
fi
ok "node: $node_bin"
[ -n "$npm_bin" ] && ok "npm: $npm_bin" || { err "没找到 npm"; exit 2; }

step "从源码安装 pojia CLI"
if [ ! -f "$src_dir/package.json" ]; then err "当前目录不是 pojia 源码包（缺 package.json）"; exit 2; fi
(cd "$src_dir" && "$npm_bin" link) || {
  warn "npm link 失败，尝试 npm install -g ."
  (cd "$src_dir" && "$npm_bin" install -g .) || { err "安装失败"; exit 3; }
}

step "自检"
pojia_bin="$(command -v pojia 2>/dev/null || true)"
if [ -z "$pojia_bin" ] && [ -n "$npm_bin" ]; then
  root="$("$npm_bin" root -g 2>/dev/null || true)"
  [ -n "$root" ] && [ -x "$(dirname "$root")/pojia" ] && pojia_bin="$(dirname "$root")/pojia"
fi
if [ -n "$pojia_bin" ]; then
  ok "pojia: $pojia_bin"
  "$pojia_bin" doctor 2>/dev/null | head -n 8 || true
else
  warn "pojia 不在 PATH；重开终端或把 npm 全局 bin 加入 PATH 后再试。"
fi
ok "完成。下一步：pojia apply codex / pojia apply claude（或先 pojia doctor）。"
