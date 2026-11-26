// claude code 通道：~/.claude/CLAUDE.md 的 managed block（用户层 system-reminder）。
// 注意：CLAUDE.md 进的是 <system-reminder> 上下文块（用户消息），不是 system 数组；
// 它压不住宿主系统提示词，但无需改启动方式。要 sys 层请用 --system-prompt-file（见 shim）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { currentPrompt } from "../persona.js";
import { readText, atomicWrite, withManagedBlock, withoutManagedBlock } from "./common.js";

const BEGIN = "<!-- >>> pojia managed block (claude code) - do not edit inside -->";
const END = "<!-- <<< pojia managed block -->";

function claudeHome() { return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"); }
function pojiaHome() { return process.env.POJIA_HOME || path.join(os.homedir(), ".pojia"); }
function claudeMd() { return path.join(claudeHome(), "CLAUDE.md"); }
function sysFile() { return path.join(pojiaHome(), "injections", "claude-system.md"); }

export function status() {
  const text = readText(claudeMd());
  const homeText = readText(path.join(os.homedir(), "CLAUDE.md"));
  return {
    channel: "claude",
    installed: text.includes(BEGIN) || homeText.includes(BEGIN),
    claudeMd: claudeMd(),
    sysFile: sysFile(),
    sysFileExists: fs.existsSync(sysFile()),
    note: "CLAUDE.md 是用户层注入；sys 层需 --system-prompt-file",
  };
}

export function apply() {
  const file = claudeMd();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const prompt = currentPrompt();
  const orig = readText(file);
  atomicWrite(file, withManagedBlock(orig, BEGIN, END, "pojia 人设注入：\n\n" + prompt.trim()));
  // 同时生成 sys 层文件，供 shim / 手动 --system-prompt-file 使用
  const sys = sysFile();
  fs.mkdirSync(path.dirname(sys), { recursive: true });
  atomicWrite(sys, prompt + "\n");
  return { ok: true, channel: "claude", claudeMd: file, sysFile: sys };
}

export function revert() {
  const file = claudeMd();
  const orig = readText(file);
  if (!orig.includes(BEGIN)) return { ok: false, error: "CLAUDE.md 中没有 pojia 块，未改动" };
  atomicWrite(file, withoutManagedBlock(orig, BEGIN, END));
  const sys = sysFile();
  if (fs.existsSync(sys)) fs.unlinkSync(sys);
  return { ok: true, channel: "claude", claudeMd: file };
}
