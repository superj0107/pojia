// pojia 全局人设库：一份人设，多宿主投放。
// 存储：~/.pojia/personas/*.md，当前选择 ~/.pojia/state.json。
// 人设文件格式与 dsh-pojia / agent-purge 兼容（frontmatter + 正文）。
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

function home() {
  return (process.env.POJIA_HOME || "").trim() || path.join(os.homedir(), ".pojia");
}
export function homeDir() { return home(); }
export function personaDir() { return path.join(home(), "personas"); }
function statePath() { return path.join(home(), "state.json"); }
function builtinPersonaFile() {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "personas", "pojia-armor.md");
}

// 简单 YAML frontmatter 解析（key: value / key: ["a","b"]），零依赖。
export function parseFrontmatter(text) {
  const normalized = String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const m = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: normalized };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, "");
    }
    meta[kv[1]] = v;
  }
  return { meta, body: m[2] };
}

export function validId(id) {
  return typeof id === "string" && /^[a-z0-9_-]{1,64}$/.test(id);
}

function builtinMeta() {
  try {
    const { meta } = parseFrontmatter(readFileSync(builtinPersonaFile(), "utf8"));
    return {
      id: validId(meta.id) ? meta.id : "pojia-armor",
      name: meta.name || "破甲内核",
      description: meta.description || "内置破甲内核",
      order: Number(meta.order) || 0,
      source: "builtin",
    };
  } catch {
    return { id: "pojia-armor", name: "破甲内核", description: "内置破甲内核", order: 0, source: "builtin" };
  }
}

export function listPersonas() {
  const out = [];
  const bm = builtinMeta();
  try {
    out.push({ ...bm, size: Buffer.byteLength(readFileSync(builtinPersonaFile(), "utf8")) });
  } catch { out.push({ ...bm, size: 0 }); }
  const dir = personaDir();
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      try {
        const { meta, body } = parseFrontmatter(readFileSync(path.join(dir, name), "utf8"));
        out.push({
          id: validId(meta.id) ? meta.id : name.replace(/\.md$/, ""),
          name: meta.name || name,
          description: meta.description || "",
          harness: Array.isArray(meta.harness) ? meta.harness : ["*"],
          model: Array.isArray(meta.model) ? meta.model : ["*"],
          order: Number.isFinite(Number(meta.order)) ? Number(meta.order) : 50,
          source: "user",
          size: Buffer.byteLength(body),
        });
      } catch { /* 坏文件跳过 */ }
    }
  }
  return out.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function readState() {
  try {
    const j = JSON.parse(readFileSync(statePath(), "utf8"));
    const current = typeof j.current === "string" ? j.current : "pojia-armor";
    return { current, applied: j.applied && typeof j.applied === "object" ? j.applied : {} };
  } catch { return { current: "pojia-armor", applied: {} }; }
}

function writeState(state) {
  const file = statePath();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, file);
}

export function setApplied(channel, info) {
  const s = readState();
  s.applied[channel] = { ...info, at: new Date().toISOString() };
  writeState(s);
  return s.applied[channel];
}
export function clearApplied(channel) {
  const s = readState();
  delete s.applied[channel];
  writeState(s);
}

export function personaFile(id) { return path.join(personaDir(), `${id}.md`); }

// 当前人设正文（用户可覆盖内置）
export function currentPrompt() {
  const id = readState().current;
  try {
    if (id === "pojia-armor") return parseFrontmatter(readFileSync(builtinPersonaFile(), "utf8")).body;
    return parseFrontmatter(readFileSync(personaFile(id), "utf8")).body;
  } catch {
    return parseFrontmatter(readFileSync(builtinPersonaFile(), "utf8")).body;
  }
}

export function usePersona(id) {
  if (!validId(id)) return { ok: false, error: "人设 id 只能含小写字母/数字/下划线/连字符" };
  if (!listPersonas().some((p) => p.id === id)) return { ok: false, error: `未找到人设 ${id}` };
  const s = readState();
  s.current = id;
  writeState(s);
  return { ok: true, current: id };
}

export function importPersona(id, content, meta = {}) {
  if (!validId(id)) return { ok: false, error: "人设 id 只能含小写字母/数字/下划线/连字符" };
  const body = String(content || "").replace(/^\uFEFF/, "").trim();
  if (!body) return { ok: false, error: "人设正文不能为空" };
  if (id === "pojia-armor") return { ok: false, error: "内置人设 id 保留，请换一个 id" };
  const dir = personaDir();
  mkdirSync(dir, { recursive: true });
  const clean = (s) => String(s || "").replace(/[:\[\]\n\r]/g, " ");
  const front = [
    "---",
    `id: ${id}`,
    `name: ${clean(meta.name || id)}`,
    `description: ${clean(meta.description || "")}`,
    `harness: ${Array.isArray(meta.harness) ? JSON.stringify(meta.harness) : '["*"]'}`,
    `model: ${Array.isArray(meta.model) ? JSON.stringify(meta.model) : '["*"]'}`,
    `order: ${Number.isFinite(Number(meta.order)) ? Number(meta.order) : 50}`,
    "---",
    "",
  ].join("\n");
  const file = personaFile(id);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, front + body + "\n", "utf8");
  renameSync(tmp, file);
  return { ok: true, id, size: Buffer.byteLength(body) };
}

export function deletePersona(id) {
  if (!validId(id) || id === "pojia-armor") return { ok: false, error: "内置人设不可删除" };
  const file = personaFile(id);
  if (!existsSync(file)) return { ok: false, error: `未找到人设 ${id}` };
  unlinkSync(file);
  if (readState().current === id) {
    const s = readState(); s.current = "pojia-armor"; writeState(s);
  }
  return { ok: true, id };
}

export function resolvePersonaText(idOrAt) {
  if (!idOrAt) return currentPrompt();
  try { return parseFrontmatter(readFileSync(idOrAt, "utf8")).body; }
  catch { return currentPrompt(); }
}
