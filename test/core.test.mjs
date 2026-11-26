import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "pojia-global-test-"));
  process.env.POJIA_HOME = tmp;
  process.env.CODEX_HOME = path.join(tmp, "codex");
  process.env.CLAUDE_CONFIG_DIR = path.join(tmp, "claude");
  mkdirSync(process.env.CODEX_HOME, { recursive: true });
  mkdirSync(process.env.CLAUDE_CONFIG_DIR, { recursive: true });
  writeFileSync(path.join(process.env.CODEX_HOME, "config.toml"), 'model = "test"\nsandbox_mode = "danger-full-access"\n');
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

test("persona: 内置人设可读，list 含 pojia-armor", async () => {
  const p = await import("../lib/persona.js");
  const list = p.listPersonas();
  assert.ok(list.some((x) => x.id === "pojia-armor" && x.source === "builtin"));
  assert.ok(p.currentPrompt().includes("年前"));
});

test("persona: 导入 -> 切换 -> 正文生效 -> 删除回退", async () => {
  const p = await import("../lib/persona.js");
  assert.equal(p.importPersona("mini", "只给结论。", { name: "简洁" }).ok, true);
  assert.equal(p.usePersona("mini").ok, true);
  assert.equal(p.currentPrompt().trim(), "只给结论。");
  assert.equal(p.deletePersona("mini").ok, true);
  assert.equal(p.readState().current, "pojia-armor");
});

test("codex: apply 生成 pojia-codex 启动器（-c 注入），revert 清除", async () => {
  const p = await import("../lib/persona.js");
  const codex = await import("../lib/channels/codex.js");
  p.usePersona("pojia-armor");
  const r = codex.apply();
  assert.equal(r.ok, true);
  const shim = readFileSync(r.script, "utf8");
  assert.ok(shim.includes("-c"));
  assert.ok(shim.includes("model_instructions_file"));
  assert.ok(readFileSync(r.injectionPath, "utf8").includes("年前"));
  assert.equal(codex.status().installed, true);
  // 不改 config.toml：确认裸配置未被写入 pojia 键
  const cfg = readFileSync(path.join(process.env.CODEX_HOME, "config.toml"), "utf8");
  assert.ok(!cfg.includes(".pojia/injections"));
  const rv = codex.revert();
  assert.equal(rv.ok, true);
  assert.equal(codex.status().installed, false);
});

test("claude: apply 写 managed block，revert 清除", async () => {
  const claude = await import("../lib/channels/claude.js");
  const file = path.join(process.env.CLAUDE_CONFIG_DIR, "CLAUDE.md");
  writeFileSync(file, "# 我的说明\n");
  assert.equal(claude.apply().ok, true);
  const withBlock = readFileSync(file, "utf8");
  assert.ok(withBlock.includes("pojia managed block"));
  assert.ok(withBlock.includes("# 我的说明"));
  assert.equal(claude.status().installed, true);
  assert.equal(claude.revert().ok, true);
  assert.equal(readFileSync(file, "utf8").trim(), "# 我的说明");
});

test("validate: 记录与报告", async () => {
  const v = await import("../lib/validate.js");
  v.clearValidation();
  assert.equal(v.recordProbe("refuse-1", "pass").ok, true);
  const rows = v.report();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rate, 100);
  v.clearValidation();
});
