#!/usr/bin/env bash
# install.sh 冒烟测试：不真装全局 CLI，验证参数与依赖分支。
set -uo pipefail
root="$(cd "$(dirname "$0")/.." && pwd -P)"
tmp="$(mktemp -d "${TMPDIR:-/tmp}/pojia-smoke.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT INT TERM
fails=0
check() { local d="$1"; shift; if "$@"; then printf '  ok   %s\n' "$d"; else printf '  FAIL %s\n' "$d" >&2; fails=$((fails+1)); fi; }

mkdir -p "$tmp/bin"
# 假 node / npm：记录调用，返回 0
cat >"$tmp/bin/node" <<'EOF'
#!/bin/sh
echo "fake-node $@" >> "$POJIA_SMOKE_LOG"
exit 0
EOF
cat >"$tmp/bin/npm" <<'EOF'
#!/bin/sh
echo "fake-npm $@" >> "$POJIA_SMOKE_LOG"
exit 0
EOF
chmod +x "$tmp/bin/node" "$tmp/bin/npm"
export POJIA_SMOKE_LOG="$tmp/log"
: >"$POJIA_SMOKE_LOG"

printf 'install.sh smoke:\n'
check "bash -n 语法" bash -n "$root/install.sh"
check "--help 不报错" bash "$root/install.sh" --help
check "未知参数非零退出" bash -c "POJIA_NODE='$tmp/bin/node' POJIA_NO_SEARCH=1 bash '$root/install.sh' --bogus >/dev/null 2>&1; test \$? -ne 0"
check "POJIA_NODE 显式指定可用" bash -c "POJIA_NODE='$tmp/bin/node' POJIA_NO_SEARCH=1 bash '$root/install.sh' --no-deps >/dev/null 2>&1; test \$? -eq 0"
check "卸载路径可用" bash -c "POJIA_NODE='$tmp/bin/node' POJIA_NO_SEARCH=1 bash '$root/install.sh' --uninstall >/dev/null 2>&1; test \$? -eq 0"
check "缺 node 且 --no-deps 不报错" bash -c "POJIA_NODE='$tmp/nonexistent-node' POJIA_NO_SEARCH=1 bash '$root/install.sh' --no-deps >/dev/null 2>&1; test \$? -eq 0"
check "缺 node 且默认非零退出" bash -c "POJIA_NODE='$tmp/nonexistent-node' POJIA_NO_SEARCH=1 bash '$root/install.sh' >/dev/null 2>&1; test \$? -ne 0"

if [ "$fails" -ne 0 ]; then printf '\n%d check(s) failed\n' "$fails" >&2; exit 1; fi
printf 'install.sh smoke: all ok\n'
