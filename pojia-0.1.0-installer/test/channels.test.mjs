import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "pojia-channels-test-"));
  process.env.POJIA_HOME = tmp;
  process.env.CODEX_HOME = path.join(tmp, "codex");
  process.env.CLAUDE_CONFIG_DIR = path.join(tmp, "claude");
  process.env.GROK_HOME = path.join(tmp, "grok");
  process.env.HERMES_HOME = path.join(tmp, "hermes");
  process.env.ANTIGRAVITY_HOME = path.join(tmp, "antigravity");
  process.env.KILO_CONFIG_DIR = path.join(tmp, "kilo");
  process.env.ZCODE_HOME = path.join(tmp, "zcode");
  for (const d of ["codex", "claude", "grok", "hermes", "antigravity", "kilo", "zcode"]) {
    mkdirSync(path.join(tmp, d), { recursive: true });
  }
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

test("registry: 13 个已注册通道 + roadmap/excluded 齐全", async () => {
  const reg = await import("../lib/channels/index.js");
  const names = Object.keys(reg.CHANNELS);
  assert.equal(names.length, 13);
  for (const n of ["codex", "claude", "grok", "hermes", "antigravity", "kilo", "zcode", "workbuddy", "qwen", "qoder", "kimi", "kiro", "codebuddy"]) {
    assert.ok(names.includes(n), `missing ${n}`);
    const c = reg.CHANNELS[n];
    assert.equal(typeof c.apply, "function");
    assert.equal(typeof c.revert, "function");
    assert.equal(typeof c.status, "function");
  }
  assert.ok(reg.ROADMAP.some((x) => x.name.includes("opencode")));
  assert.ok(reg.EXCLUDED.length >= 2);
});

test("ruleFile 通道: grok apply 写入 AGENTS.md 且可还原", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const g = CHANNELS.grok;
  const file = path.join(process.env.GROK_HOME, "AGENTS.md");
  writeFileSync(file, "# 原有\n");
  const r = g.apply();
  assert.equal(r.ok, true);
  assert.ok(existsSync(file));
  const withBlock = (await import("node:fs")).readFileSync(file, "utf8");
  assert.ok(withBlock.includes("pojia managed block"));
  assert.ok(withBlock.includes("# 原有"));
  assert.equal(g.status().installed, true);
  assert.equal(g.revert().ok, true);
  assert.equal((await import("node:fs")).readFileSync(file, "utf8").trim(), "# 原有");
});

test("tomlKey 通道: zcode apply/revert 幂等", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const z = CHANNELS.zcode;
  const cfg = path.join(process.env.ZCODE_HOME, "config.toml");
  writeFileSync(cfg, 'model = "z"\n');
  assert.equal(z.apply().ok, true);
  assert.equal(z.status().installed, true);
  assert.equal(z.revert().ok, true);
  assert.equal(z.status().installed, false);
});

test("shim 通道: qwen 生成启动器且可撤销", async () => {
  const { CHANNELS } = await import("../lib/channels/index.js");
  const q = CHANNELS.qwen;
  const r = q.apply();
  assert.equal(r.ok, true);
  assert.equal(q.status().installed, true);
  assert.equal(q.revert().ok, true);
  assert.equal(q.status().installed, false);
});
