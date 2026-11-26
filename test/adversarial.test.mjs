// 对抗性回归测试：把审查中发现的真实边界条件固化下来。
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validId, importPersona, personaDir, deletePersona } from "../lib/persona.js";
import { setTomlKey, backupIfNeeded } from "../lib/channels/common.js";

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "pojia-adversarial-"));
  process.env.POJIA_HOME = tmp;
  process.env.CODEX_HOME = path.join(tmp, "codex");
  process.env.CLAUDE_CONFIG_DIR = path.join(tmp, "claude");
  process.env.ZCODE_HOME = path.join(tmp, "zcode");
  for (const d of ["codex", "claude", "zcode"]) mkdirSync(path.join(tmp, d), { recursive: true });
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

test("路径穿越: validId 拒绝 ../、反斜杠、斜杠、空格、超长、空", () => {
  for (const id of ["../evil", "..\\evil", "a/b", "A B", "", "x".repeat(65)]) {
    assert.equal(validId(id), false, `should reject ${id}`);
  }
  assert.equal(validId("ok_id-1"), true);
});

test("路径穿越: importPersona 拒绝非法 id 且不在人设目录落盘", () => {
  for (const id of ["../evil", "a/b", "pojia-armor"]) {
    assert.equal(importPersona(id, "payload").ok, false);
  }
  if (existsSync(personaDir())) assert.equal(readdirSync(personaDir()).length, 0);
});

test("TOML 转义: 引号/反斜杠/换行都不会破坏单行键值", () => {
  const q = setTomlKey("a=1\n", "k", 'x"; injected = "y');
  assert.ok(q.includes('k = "x\\"; injected = \\"y"'));
  const nl = setTomlKey("a=1\n", "k", "a\nb");
  assert.ok(nl.includes("\\n") && !nl.includes('k = "a\nb"'));
  const bs = setTomlKey("a=1\n", "k", "C:\\path");
  assert.ok(bs.includes('C:\\\\path'));
});

test("备份: 多次 apply 不覆盖最初备份", () => {
  const f = path.join(tmp, "c.toml");
  writeFileSync(f, "ORIGINAL");
  backupIfNeeded(f, "x");
  writeFileSync(f, "CHANGED");
  backupIfNeeded(f, "x");
  assert.equal(readFileSync(f + ".pojia-bak", "utf8"), "ORIGINAL");
});

test("codex revert: 保留用户中间改动，仅还原 pojia 键", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const c = CHANNELS.codex;
  const cfg = path.join(process.env.CODEX_HOME, "config.toml");
  writeFileSync(cfg, 'model="x"\nmodel_instructions_file="ORIGINAL_AGENT"\n');
  assert.equal(c.apply().ok, true);
  // 用户中途改了别的键
  writeFileSync(cfg, 'model="USER_CHANGED"\nmodel_instructions_file="' + path.join(tmp, "injections", "codex.md").replace(/\\/g, "\\\\") + '"\n');
  const r = c.revert();
  assert.equal(r.ok, true);
  const after = readFileSync(cfg, "utf8");
  assert.ok(after.includes('model="USER_CHANGED"'), "用户改动应保留");
  assert.ok(after.includes("ORIGINAL_AGENT"), "原键值应恢复");
});

test("codex revert: 无备份时不改动配置", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const cfg = path.join(process.env.CODEX_HOME, "config.toml");
  writeFileSync(cfg, 'model="x"\n');
  const r = CHANNELS.codex.revert();
  assert.equal(r.ok, false);
  assert.equal(readFileSync(cfg, "utf8"), 'model="x"\n');
});

test("claude revert: 无 managed block 时不删除用户内容", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const f = path.join(process.env.CLAUDE_CONFIG_DIR, "CLAUDE.md");
  writeFileSync(f, "# 我的说明\n");
  assert.equal(CHANNELS.claude.revert().ok, false);
  assert.equal(readFileSync(f, "utf8"), "# 我的说明\n");
});

test("workbuddy: 递归发现版本化 tpl 目录（只读检查，不 apply 真实配置）", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const st = CHANNELS.workbuddy.status();
  if (st.files && st.files.length) {
    assert.ok(st.files.every((f) => /prompt.*\.tpl$/i.test(f)));
  }
  assert.equal(typeof CHANNELS.workbuddy.apply, "function");
});

test("全通道: status 不抛异常；隔离型通道 apply/revert 不抛异常", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const isolated = ["codex", "claude", "grok", "hermes", "antigravity", "kilo", "zcode", "qwen", "qoder", "kimi", "kiro", "codebuddy"];
  for (const [name, c] of Object.entries(CHANNELS)) {
    assert.equal(typeof c.status, "function", name);
    assert.doesNotThrow(() => c.status(), `${name} status throws`);
    if (isolated.includes(name)) {
      assert.doesNotThrow(() => c.apply(), `${name} apply throws`);
      assert.doesNotThrow(() => c.revert(), `${name} revert throws`);
    }
  }
});
