#!/usr/bin/env node
// pojia — 全局多 Agent 人设与行为编排（自实现通道，不依赖 agent-purge）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as persona from "../lib/persona.js";
import * as validate from "../lib/validate.js";
import * as codex from "../lib/channels/codex.js";
import * as claude from "../lib/channels/claude.js";

const CHANNELS = { codex, claude };

function help() {
  return `pojia — 一份人设，多宿主投放

用法:
  pojia persona list                  列出人设
  pojia persona use <id>              切换当前人设
  pojia persona show                  查看当前人设正文
  pojia persona import <id> <正文>     导入/新建人设
  pojia persona delete <id>           删除用户人设

  pojia status                        查看各宿主通道状态
  pojia apply [codex|claude|all]      把当前人设投放到宿主（默认 all）
  pojia revert [codex|claude|all]     撤销投放，恢复原配置
  pojia doctor                        环境自检

  pojia validate list                 列出有效性探针
  pojia validate record <id> <pass|fail|skip> [备注]
  pojia validate report               各人设命中率
  pojia validate clear

环境:
  POJIA_HOME   数据目录（默认 ~/.pojia）
  CODEX_HOME   codex 配置目录（默认 ~/.codex）
  CLAUDE_CONFIG_DIR  claude 配置目录（默认 ~/.claude）

许可: CC BY-NC-SA 4.0，非商用。使用见 DISCLAIMER.md。`;
}

function out(value) { console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2)); }

function personaCommand(args) {
  const action = args[0] || "list";
  if (action === "list" || action === "ls") {
    const cur = persona.readState().current;
    const rows = persona.listPersonas().map((p) => `${p.id === cur ? "*" : " "} ${p.id.padEnd(18)} ${p.name} [${p.source}] ${p.description}`);
    return `当前: ${cur}\n${rows.join("\n")}`;
  }
  if (action === "use") return persona.usePersona(args[1]);
  if (action === "show") {
    const cur = persona.readState().current;
    return { current: cur, bytes: Buffer.byteLength(persona.currentPrompt()), home: persona.homeDir() };
  }
  if (action === "import" || action === "create") return persona.importPersona(args[1], args.slice(2).join(" "));
  if (action === "delete" || action === "rm") return persona.deletePersona(args[1]);
  return help();
}

function validateCommand(args) {
  const action = args[0] || "list";
  if (action === "list" || action === "ls") return validate.listProbes(args[1]);
  if (action === "record") return validate.recordProbe(args[1], args[2], args.slice(3).join(" "));
  if (action === "report") return validate.report();
  if (action === "clear") return validate.clearValidation();
  return help();
}

function channelNames(arg) {
  if (!arg || arg === "all") return Object.keys(CHANNELS);
  if (!CHANNELS[arg]) throw new Error(`未知通道 ${arg}（可用 codex/claude/all）`);
  return [arg];
}

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    switch (cmd) {
      case "persona":
      case "p": return out(personaCommand(args));
      case "validate":
      case "v": return out(validateCommand(args));
      case "status":
      case "s": return out(Object.keys(CHANNELS).map((n) => CHANNELS[n].status()));
      case "apply":
      case "a": {
        const results = channelNames(args[0]).map((n) => {
          const r = CHANNELS[n].apply();
          if (r.ok) persona.setApplied(n, { injection: r.injectionPath || r.claudeMd || "" });
          return r;
        });
        return out(results);
      }
      case "revert":
      case "r": {
        const results = channelNames(args[0]).map((n) => {
          const r = CHANNELS[n].revert();
          if (r.ok) persona.clearApplied(n);
          return r;
        });
        return out(results);
      }
      case "doctor": {
        return out({
          pojiaHome: persona.homeDir(),
          personaCount: persona.listPersonas().length,
          current: persona.readState().current,
          channels: Object.keys(CHANNELS).map((n) => CHANNELS[n].status()),
        });
      }
      case "help":
      case "-h":
      case "--help":
      case undefined: return console.log(help());
      default: return console.error(`未知命令: ${cmd}\n\n${help()}`);
    }
  } catch (e) {
    console.error("error:", e && e.message ? e.message : String(e));
    process.exitCode = 1;
  }
}

main();
