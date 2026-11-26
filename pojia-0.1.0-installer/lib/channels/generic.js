// 通用通道工厂：多数 agent 的注入落点可归为两类：
//  1) toml-key  : 在 <config> 里写 key = "<instructions 文件>"
//  2) rule-file : 在某个 md 文件里写 managed block（用户层）
// 每类都支持 apply/revert/status、备份与隔离目录（通过 env 覆盖）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { currentPrompt } from "../persona.js";
import { readText, atomicWrite, backupIfNeeded, setTomlKey } from "./common.js";

function pojiaHome() { return process.env.POJIA_HOME || path.join(os.homedir(), ".pojia"); }

// ---------- toml-key 通道 ----------
export function tomlKeyChannel({ name, configPath, key = "model_instructions_file", note = "" }) {
  const resolveConfig = () => typeof configPath === "function" ? configPath() : configPath;
  const bak = () => resolveConfig() + ".pojia-bak";
  const injection = () => path.join(pojiaHome(), "injections", `${name}.md`);

  return {
    name,
    status() {
      const cfg = readText(resolveConfig());
      const m = cfg.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
      const pointing = m ? m[1] : "";
      return {
        channel: name,
        installed: !!pointing && path.normalize(pointing) === path.normalize(injection()),
        currentValue: pointing || null,
        configPath: resolveConfig(),
        injectionPath: injection(),
        backupExists: fs.existsSync(bak()),
        note,
      };
    },
    apply() {
      const cfg = resolveConfig();
      const dir = path.dirname(cfg);
      if (!fs.existsSync(dir)) return { ok: false, error: `${name} 配置目录不存在：${dir}` };
      backupIfNeeded(cfg, name);
      const inj = injection();
      fs.mkdirSync(path.dirname(inj), { recursive: true });
      atomicWrite(inj, currentPrompt() + "\n");
      atomicWrite(cfg, setTomlKey(readText(cfg), key, inj));
      return { ok: true, channel: name, configPath: cfg, injectionPath: inj };
    },
    revert() {
      const cfg = resolveConfig();
      const b = bak();
      if (!fs.existsSync(b)) return { ok: false, error: `没有 pojia 备份，未改动 ${name} 配置` };
      atomicWrite(cfg, readText(b));
      fs.unlinkSync(b);
      return { ok: true, channel: name, restoredFrom: b };
    },
  };
}

// ---------- rule-file 通道（用户层 managed block） ----------
export function ruleFileChannel({ name, filePath, note = "" }) {
  const resolveFile = () => typeof filePath === "function" ? filePath() : filePath;
  const BEGIN = `<!-- >>> pojia managed block (${name}) - do not edit inside -->`;
  const END = "<!-- <<< pojia managed block -->";
  return {
    name,
    status() {
      const file = resolveFile();
      const text = readText(file);
      return {
        channel: name,
        installed: text.includes(BEGIN),
        filePath: file,
        note: note || "用户层注入（system-reminder），非 system 数组",
      };
    },
    apply() {
      const file = resolveFile();
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let text = readText(file);
      const i = text.indexOf(BEGIN);
      if (i >= 0) {
        const j = text.indexOf(END, i);
        if (j >= 0) text = text.slice(0, i) + text.slice(j + END.length);
      }
      text = text.replace(/\s*$/, "");
      atomicWrite(file, text + "\n\n" + BEGIN + "\n" + currentPrompt().trim() + "\n" + END + "\n");
      return { ok: true, channel: name, filePath: file };
    },
    revert() {
      const file = resolveFile();
      const text = readText(file);
      const i = text.indexOf(BEGIN);
      if (i < 0) return { ok: false, error: `${name} 文件中没有 pojia 块，未改动` };
      const j = text.indexOf(END, i);
      if (j < 0) return { ok: false, error: `${name} 块标记损坏，未自动改动` };
      atomicWrite(file, (text.slice(0, i) + text.slice(j + END.length)).replace(/\s*$/, "") + "\n");
      return { ok: true, channel: name, filePath: file };
    },
  };
}
