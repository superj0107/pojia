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

test("codex: 写 config.toml developer_instructions，保留其它键，revert 还原", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const c = CHANNELS.codex;
  const cfg = path.join(process.env.CODEX_HOME, "config.toml");
  const original = 'model = "m"\nsandbox_mode = "danger-full-access"\n';
  writeFileSync(cfg, original);
  assert.equal(c.apply().ok, true);
  const after = readFileSync(cfg, "utf8");
  assert.ok(after.includes("pojia developer_instructions"));
  assert.ok(after.includes("model = \"m\""), "其它键保留");
  assert.equal(c.status().installed, true);
  assert.equal(c.revert().ok, true);
  assert.equal(c.status().installed, false);
});

test("codex: 人设含 ''' 时不破坏 TOML（转义兜底）", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const p = await import("../lib/persona.js");
  const cfg = path.join(process.env.CODEX_HOME, "config.toml");
  writeFileSync(cfg, 'model = "m"\n');
  assert.equal(p.importPersona("tricky", "内容含 ''' 三引号 should not break TOML", { name: "t" }).ok, true);
  assert.equal(p.usePersona("tricky").ok, true);
  assert.equal(CHANNELS.codex.apply().ok, true);
  const after = readFileSync(cfg, "utf8");
  // 内容里原本的 ''' 已被替换，块结构完整（只有一个起始 ''' 与一个结束 '''）
  const tripleCount = (after.match(/'''/g) || []).length;
  assert.equal(tripleCount, 2, "应只剩 developer_instructions 的起止三引号");
  assert.equal(CHANNELS.codex.revert().ok, true);
  p.deletePersona("tricky");
  p.usePersona("pojia-armor");
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
