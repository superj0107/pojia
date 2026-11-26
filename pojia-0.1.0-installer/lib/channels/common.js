// 通道公共工具：原子写、备份、TOML 单键改写（零依赖，够用即可）。
import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";

export function readText(p) {
  try { return readFileSync(p, "utf8"); } catch { return ""; }
}

export function atomicWrite(p, text) {
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, text, "utf8");
  renameSync(tmp, p);
}

export function backupIfNeeded(p, tag) {
  const bak = `${p}.pojia-bak`;
  if (!existsSync(p)) return null;
  if (!existsSync(bak)) {
    writeFileSync(bak, readFileSync(p), "utf8");
    return bak;
  }
  return bak;
}

// 改 TOML 顶层的简单 key = "value"（只改未注释的第一次出现；找不到就追加到末尾）。
// 不解析整个 TOML，避免引入依赖或改动无关行。
export function setTomlKey(text, key, value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = new RegExp(`^${key}\\s*=.*$`, "m");
  const line = `${key} = "${escaped}"`;
  if (re.test(text)) return text.replace(re, line);
  return text.replace(/\s*$/, "") + "\n" + line + "\n";
}

export function unsetTomlKey(text, key) {
  const re = new RegExp(`^${key}\\s*=.*\\n?`, "m");
  return text.replace(re, "");
}

// 在文件末尾写入带标记的人设块（用于 CLAUDE.md 这类用户层注入）。
export function withManagedBlock(text, begin, end, body) {
  let out = text;
  const i = out.indexOf(begin);
  if (i >= 0) {
    const j = out.indexOf(end, i);
    if (j >= 0) {
      const k = j + end.length;
      out = out.slice(0, i) + out.slice(k);
    }
  }
  out = out.replace(/\s*$/, "");
  return out + "\n\n" + begin + "\n" + body.trim() + "\n" + end + "\n";
}

export function withoutManagedBlock(text, begin, end) {
  const i = text.indexOf(begin);
  if (i < 0) return text;
  const j = text.indexOf(end, i);
  if (j < 0) return text;
  const k = j + end.length;
  return (text.slice(0, i) + text.slice(k)).replace(/\s*$/, "") + "\n";
}
