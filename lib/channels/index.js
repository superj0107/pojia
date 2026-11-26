// pojia 通道注册表：每个通道自实现 apply/revert/status。
// 落点参考各 agent 的公开配置约定与实测结论；本机未装的通道标 unverified。
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import * as codex from "./codex.js";
import * as claude from "./claude.js";
import { ruleFileChannel, tomlKeyChannel } from "./generic.js";
import { tplChannel, shimChannel } from "./generic2.js";

const home = os.homedir();
const env = (k, d) => (process.env[k] || d);
const xdg = (k) => path.join(env("XDG_CONFIG_HOME", path.join(home, ".config")), k);

// ruleFile 型：写 AGENTS.md / SOUL.md（用户层 system-reminder / 会话首轮读）
const grok = ruleFileChannel({
  name: "grok",
  filePath: () => path.join(env("GROK_HOME", path.join(home, ".grok")), "AGENTS.md"),
  note: "AGENTS.md 启动时读一次；未实测本机（无 grok 可执行文件）",
});
const hermes = ruleFileChannel({
  name: "hermes",
  filePath: () => path.join(env("HERMES_HOME", process.platform === "win32" ? path.join(home, "AppData", "Local", "hermes") : path.join(home, ".hermes")), "SOUL.md"),
  note: "SOUL.md 仅会话首次/重建时读，续会话不生效；未实测",
});
const antigravity = ruleFileChannel({
  name: "antigravity",
  filePath: () => path.join(env("ANTIGRAVITY_HOME", path.join(home, ".antigravity")), "AGENTS.md"),
  note: "全局 AGENTS.md always_on；agent-purge 实测可用，本机未装",
});
const kilo = ruleFileChannel({
  name: "kilo",
  filePath: () => path.join(env("KILO_CONFIG_DIR", xdg("kilo")), "AGENTS.md"),
  note: "AGENTS.md 系统上下文追加；未实测",
});

// toml-key 型：zcode / omp 等用配置键指向注入文件（未实测，留骨架）
const zcode = tomlKeyChannel({
  name: "zcode",
  configPath: () => path.join(env("ZCODE_HOME", path.join(home, ".zcode")), "config.toml"),
  key: "model_instructions_file",
  note: "agent-purge 标未实测；zcode 后端 CLI 拿不到 customSystemPrompt，可能不生效",
});

// workbuddy：替换内置插件缓存里的 prompt 模板（system 层）
const workbuddyBuiltin = path.join(home, ".workbuddy", "plugins", "cache", "workbuddy-builtin");
// workbuddy：tpl 在版本化子目录（welcomemode-*/<ver>/prompt.tpl），递归发现。
function discoverWorkbuddyTpls() {
  const found = [];
  const walk = (dir, depth = 0) => {
    if (!fs.existsSync(dir) || depth > 5) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (/^skill-|^node_modules/.test(e.name)) continue;
        walk(p, depth + 1);
      } else if (/^prompt.*\.tpl$|^workbuddy-.*\.tpl$/i.test(e.name)) {
        found.push(p);
      }
    }
  };
  walk(workbuddyBuiltin);
  return found;
}
const workbuddy = tplChannel({
  name: "workbuddy",
  files: discoverWorkbuddyTpls,
  note: "递归替换 WorkBuddy 缓存下所有 prompt*.tpl（版本化目录）；需重启 WorkBuddy",
});

// shim 型：用启动参数注入（sys 层），生成 pojia-<name> 启动器
const qwen = shimChannel({ name: "qwen", exe: "qwen", flag: "--system-prompt", note: "qwen --system-prompt；用 pojia-qwen 启动" });
const qoder = shimChannel({ name: "qoder", exe: "qodercli", flag: "--system-prompt", note: "qodercli --system-prompt" });
const kimi = shimChannel({ name: "kimi", exe: "kimi", flag: "--agent-file", note: "kimi --agent-file；临时 agent.md" });
const kiro = shimChannel({ name: "kiro", exe: "kiro-cli", flag: "--agent-file", note: "kiro-cli chat --agent；本机未实测" });
const codebuddy = shimChannel({ name: "codebuddy", exe: "codebuddy", flag: "--system-prompt", note: "codebuddy --system-prompt；install 层无提示词入口" });

// opencode / pi / omp：sys 层需要装插件扩展 hook，工程量大，列入 roadmap，不注册假通道。
// cruishe / workbuddy-ai / kilo-code 等：同上或未实测，roadmap。

export const CHANNELS = Object.freeze({
  codex,
  claude,
  grok,
  hermes,
  antigravity,
  kilo,
  zcode,
  workbuddy,
  qwen,
  qoder,
  kimi,
  kiro,
  codebuddy,
});

export const ROADMAP = Object.freeze([
  { name: "opencode", reason: "sys 层需装插件 hook chat.system.transform，每家 API 不同" },
  { name: "pi / pi-desktop", reason: "需 imported extension hook before_agent_start / context" },
  { name: "omp", reason: "需扩展 hook before_agent_start" },
  { name: "crush", reason: "配置在 XDG，但 sys 层落点未实测" },
  { name: "dsh", reason: "走姊妹项目 dsh-pojia，独立插件" },
]);

export const EXCLUDED = Object.freeze([
  { name: "qwen(install层)/qoder/kiro(常驻)/kimi(常驻)", reason: "仅启动参数有效，常驻配置无 sys 入口" },
  { name: "continue", reason: "无全局可写配置文件" },
  { name: "auggie/goose", reason: "无系统提示词入口" },
]);
