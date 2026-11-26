#!/usr/bin/env bash
# pojia 卸载：转发 install.sh --uninstall（人设与注入文件保留）
set -euo pipefail
exec bash "$(dirname "$0")/install.sh" --uninstall "$@"
