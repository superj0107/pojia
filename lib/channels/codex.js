// codex 通道：通过 ~/.codex/config.toml 的 model_instructions_file 注入系统提示词。
// apply 把当前人设写到 ~/.pojia/injections/codex.md 并把键指向它；revert 从 .pojia-bak 整体恢复。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { currentPrompt } from "../persona.js";
import { readText, atomicWrite, backupIfNeeded, setTomlKey } from "./common.js";

const KEY = "model_instructions_file";

function codexHome() { return process.env.CODEX_HOME || path.join(os.homedir(), ".codex"); }
function pojiaHome() { return process.env.POJIA_HOME || path.join(os.homedir(), ".pojia"); }
function configPath() { return path.join(codexHome(), "config.toml"); }
function injectionPath() { return path.join(pojiaHome(), "injections", "codex.md"); }
function backupPath() { return configPath() + ".pojia-bak"; }

export function status() {
  const cfg = readText(configPath());
  const m = cfg.match(new RegExp(`^${KEY}\\s*=\\s*"([^"]*)"`, "m"));
  const pointing = m ? m[1] : "";
  return {
    channel: "codex",
    installed: !!pointing && path.normalize(pointing) === path.normalize(injectionPath()),
    currentValue: pointing || null,
    configPath: configPath(),
    injectionPath: injectionPath(),
    backupExists: fs.existsSync(backupPath()),
  };
}

export function apply() {
  const cfgPath = configPath();
  if (!fs.existsSync(path.dirname(cfgPath))) return { ok: false, error: `codex 目录不存在：${path.dirname(cfgPath)}` };
  const text = readText(cfgPath);
  backupIfNeeded(cfgPath, "codex");
  const inj = injectionPath();
  fs.mkdirSync(path.dirname(inj), { recursive: true });
  atomicWrite(inj, currentPrompt() + "\n");
  atomicWrite(cfgPath, setTomlKey(text, KEY, inj));
  return { ok: true, channel: "codex", injectionPath: inj, configPath: cfgPath };
}

export function revert() {
  const cfgPath = configPath();
  const bak = backupPath();
  if (!fs.existsSync(bak)) return { ok: false, error: "没有 pojia 备份，未改动 config.toml" };
  atomicWrite(cfgPath, readText(bak));
  fs.unlinkSync(bak);
  return { ok: true, channel: "codex", restoredFrom: bak };
}
