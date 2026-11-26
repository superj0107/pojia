// codex 通道（CLI + 桌面 App 通用）：
// 注入走 ~/.codex/config.toml 的 developer_instructions 三引号块。
// 实测：model_instructions_file 在 codex 0.170+ 的 config.toml 里被忽略，
// 但 developer_instructions 会被读取，且 app-server（桌面 App）读同一份 config，
// 所以这一个键同时覆盖 CLI 与桌面 App。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { currentPrompt } from "../persona.js";
import { readText, atomicWrite, backupIfNeeded } from "./common.js";

const MARK = "# >>> pojia developer_instructions (managed) - do not edit inside";
const MARK_END = "# <<< pojia developer_instructions";

function codexHome() { return process.env.CODEX_HOME || path.join(os.homedir(), ".codex"); }
function pojiaHome() { return process.env.POJIA_HOME || path.join(os.homedir(), ".pojia"); }
function configPath() { return path.join(codexHome(), "config.toml"); }
function injectionPath() { return path.join(pojiaHome(), "injections", "codex.md"); }
function backupPath() { return configPath() + ".pojia-bak"; }

// 把任意文本安全地放进 TOML 多行字面量字符串 '''...'''
// 字面量字符串不做转义，但内容里不能出现 '''。人设正文已确认不含，这里再兜一层。
function toTomlBlock(content) {
  const safe = String(content).replace(/'''/g, "''\u200b'");
  return "'''\n" + MARK + "\n" + safe.replace(/\r\n/g, "\n").trim() + "\n" + MARK_END + "\n'''";
}

function replaceDeveloperInstructions(text, block) {
  const re = /^developer_instructions\s*=\s*'''[\s\S]*?'''/m;
  if (re.test(text)) return text.replace(re, "developer_instructions = " + block);
  // 没有该键 → 追加到文件末尾
  return text.replace(/\s*$/, "") + "\n\ndeveloper_instructions = " + block + "\n";
}

function extractOriginalValue(text) {
  const m = text.match(/^developer_instructions\s*=\s*'''[\s\S]*?'''/m);
  return m ? m[0] : null;
}

export function status() {
  const cfg = readText(configPath());
  const ours = cfg.includes(MARK);
  return {
    channel: "codex",
    installed: ours,
    configPath: configPath(),
    injectionPath: injectionPath(),
    promptFileExists: fs.existsSync(injectionPath()),
    backupExists: fs.existsSync(backupPath()),
    note: "写 config.toml 的 developer_instructions；CLI 与桌面 App 均读取，重启 App 生效",
  };
}

export function apply() {
  const cfgPath = configPath();
  if (!fs.existsSync(path.dirname(cfgPath))) return { ok: false, error: `codex 目录不存在：${path.dirname(cfgPath)}` };
  const text = readText(cfgPath);
  backupIfNeeded(cfgPath, "codex");
  const inj = injectionPath();
  fs.mkdirSync(path.dirname(inj), { recursive: true });
  const prompt = currentPrompt();
  atomicWrite(inj, prompt + "\n");
  atomicWrite(cfgPath, replaceDeveloperInstructions(text, toTomlBlock(prompt)));
  return { ok: true, channel: "codex", configPath: cfgPath, injectionPath: inj, note: "重启 Codex 桌面 App 后生效" };
}

export function revert() {
  const cfgPath = configPath();
  const bak = backupPath();
  const current = readText(cfgPath);
  // 优先从备份取回原 developer_instructions 值，只还原这一个键，保留其它改动。
  let restored = false;
  if (fs.existsSync(bak)) {
    const orig = extractOriginalValue(readText(bak));
    if (orig) {
      atomicWrite(cfgPath, current.replace(/^developer_instructions\s*=\s*'''[\s\S]*?'''/m, orig));
    } else {
      // 原来没有该键 → 移除我们加的
      atomicWrite(cfgPath, current.replace(/^developer_instructions\s*=\s*'''[\s\S]*?'''\n?/m, ""));
    }
    fs.unlinkSync(bak);
    restored = true;
  } else if (current.includes(MARK)) {
    atomicWrite(cfgPath, current.replace(/^developer_instructions\s*=\s*'''[\s\S]*?'''\n?/m, ""));
    restored = true;
  }
  const inj = injectionPath();
  if (fs.existsSync(inj)) fs.unlinkSync(inj);
  return { ok: restored, channel: "codex", restored, note: restored ? "已还原 developer_instructions" : "无需还原" };
}
