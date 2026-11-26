// codex 通道：codex 0.170+ 只认启动时 -c model_instructions_file=<文件>，
// 写进 config.toml 的同名键会被忽略（实测）。所以这里生成 pojia-codex 启动包装器，
// 用 -c 参数注入当前人设。裸敲 codex 不注入，用 pojia-codex 才注入。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { currentPrompt } from "../persona.js";
import { readText, atomicWrite } from "./common.js";

function pojiaHome() { return process.env.POJIA_HOME || path.join(os.homedir(), ".pojia"); }
function binDir() { return path.join(pojiaHome(), "bin"); }
function scriptPath() {
  const base = path.join(binDir(), "pojia-codex");
  return process.platform === "win32" ? base + ".cmd" : base;
}
function injectionPath() { return path.join(pojiaHome(), "injections", "codex.md"); }
function legacyConfigBackup() {
  const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  return path.join(home, "config.toml.pojia-bak");
}

export function status() {
  const sp = scriptPath();
  return {
    channel: "codex",
    installed: fs.existsSync(sp),
    script: sp,
    injectionPath: injectionPath(),
    promptFileExists: fs.existsSync(injectionPath()),
    legacyConfigBackup: legacyConfigBackup(),
    legacyBackupExists: fs.existsSync(legacyConfigBackup()),
    note: "用 pojia-codex 启动才注入；裸敲 codex 不生效（codex 0.170+ 忽略 config.toml 同名键）",
  };
}

export function apply() {
  const inj = injectionPath();
  fs.mkdirSync(path.dirname(inj), { recursive: true });
  atomicWrite(inj, currentPrompt() + "\n");
  fs.mkdirSync(binDir(), { recursive: true });
  const sp = scriptPath();
  const cmd = process.platform === "win32"
    ? `@echo off\r\ncodex -c "model_instructions_file=${inj}" %*\r\n`
    : `#!/bin/sh\nexec codex -c "model_instructions_file=${inj}" "$@"\n`;
  atomicWrite(sp, cmd);
  return { ok: true, channel: "codex", script: sp, injectionPath: inj, note: "把 ~/.pojia/bin 加入 PATH，用 pojia-codex 启动" };
}

export function revert() {
  const sp = scriptPath();
  if (fs.existsSync(sp)) fs.unlinkSync(sp);
  const inj = injectionPath();
  if (fs.existsSync(inj)) fs.unlinkSync(inj);
  // 清理旧版误写进 config.toml 的键：若我们留过备份，把原键值还原回去。
  const bak = legacyConfigBackup();
  const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const cfg = path.join(home, "config.toml");
  let legacyRestored = false;
  if (fs.existsSync(bak) && fs.existsSync(cfg)) {
    atomicWrite(cfg, readText(bak));
    fs.unlinkSync(bak);
    legacyRestored = true;
  }
  return { ok: true, channel: "codex", removed: sp, legacyRestored };
}
