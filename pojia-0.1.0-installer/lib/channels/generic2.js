// 追加两类通道：tpl 文件替换（workbuddy）、启动参数 shim（qwen/qoder/kimi/kiro/grok 等）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { currentPrompt } from "../persona.js";
import { readText, atomicWrite, backupIfNeeded } from "./common.js";

function pojiaHome() { return process.env.POJIA_HOME || path.join(os.homedir(), ".pojia"); }

// tpl 替换：把指定 prompt.tpl 原文备份后整体替换为人设（system 层）。
export function tplChannel({ name, files, note = "" }) {
  const resolveFiles = () => (typeof files === "function" ? files() : files).filter((f) => fs.existsSync(f));
  return {
    name,
    status() {
      const hits = resolveFiles();
      return {
        channel: name,
        installed: hits.some((f) => fs.existsSync(f + ".pojia-bak")),
        files: hits,
        note: note || "system 层模板替换；改后需重启对应 agent",
      };
    },
    apply() {
      const hits = resolveFiles();
      if (!hits.length) return { ok: false, error: `${name} 未找到可写的 prompt 模板` };
      const prompt = currentPrompt();
      const written = [];
      for (const f of hits) {
        backupIfNeeded(f, name);
        atomicWrite(f, prompt + "\n");
        written.push(f);
      }
      return { ok: true, channel: name, files: written };
    },
    revert() {
      const restored = [];
      const root = pojiaHome();
      // 扫描已知目录里所有 .pojia-bak
      const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) walk(p);
          else if (e.name.endsWith(".pojia-bak")) {
            const orig = p.slice(0, -".pojia-bak".length);
            atomicWrite(orig, readText(p));
            fs.unlinkSync(p);
            restored.push(orig);
          }
        }
      };
      walk(path.join(os.homedir(), ".workbuddy", "plugins", "cache", "workbuddy-builtin"));
      void root;
      return { ok: true, channel: name, restored };
    },
  };
}

// shim 启动包装：生成 pojia-<name> 脚本，用启动参数注入人设（sys 层）。
export function shimChannel({ name, exe, flag = "--system-prompt", fileFlag = false, note = "" }) {
  const dir = path.join(pojiaHome(), "bin");
  const script = () => path.join(dir, `pojia-${name}${process.platform === "win32" ? ".cmd" : ""}`);
  const promptFile = () => path.join(pojiaHome(), "injections", `${name}-sys.md`);

  return {
    name,
    status() {
      const p = promptFile();
      return {
        channel: name,
        installed: fs.existsSync(script()),
        script: script(),
        promptFile: p,
        promptFileExists: fs.existsSync(p),
        note: note || "用 `pojia-<name>` 启动才注入；裸敲原命令不生效",
      };
    },
    apply() {
      fs.mkdirSync(dir, { recursive: true });
      fs.mkdirSync(path.dirname(promptFile()), { recursive: true });
      const pf = promptFile();
      atomicWrite(pf, currentPrompt() + "\n");
      const arg = fileFlag ? `${flag} "${pf}"` : `${flag} "${pf}"`;
      const content = process.platform === "win32"
        ? `@echo off\r\n"${exe}" ${arg} %*\r\n`
        : `#!/bin/sh\nexec "${exe}" ${arg} "$@"\n`;
      atomicWrite(script(), content);
      return { ok: true, channel: name, script: script(), promptFile: pf, note: "把 pojia 的 bin 目录加入 PATH，用 pojia-" + name + " 启动" };
    },
    revert() {
      const s = script();
      if (fs.existsSync(s)) fs.unlinkSync(s);
      const pf = promptFile();
      if (fs.existsSync(pf)) fs.unlinkSync(pf);
      return { ok: true, channel: name, removed: s };
    },
  };
}
