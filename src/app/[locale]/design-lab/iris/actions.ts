"use server";

// Numeric fields must be plain decimal literals so readFromConfig can parse them.

import { writeFile, readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { type IrisConfig, type IrisAnimation, type IrisInteractiveMode } from "@/config/iris-config";

const execAsync = promisify(exec);

const CONFIG_PATH = path.join(process.cwd(), "src/config/iris-config.ts");

function findPresetBody(content: string, presetName: string): { bodyStart: number; bodyEnd: number } | null {
  const startPattern = new RegExp(`export const ${presetName}[^{]*\\{`);
  const startMatch = startPattern.exec(content);
  if (!startMatch) {
    return null;
  }

  const bodyStart = startMatch.index + startMatch[0].length;
  let depth = 1, bodyEnd = bodyStart;
  while (bodyEnd < content.length && depth > 0) {
    if (content[bodyEnd] === "{") {
      depth++;
    }
    if (content[bodyEnd] === "}") {
      depth--;
    }
    bodyEnd++;
  }
  return { bodyStart, bodyEnd: bodyEnd - 1 };
}

function extractObjectBlock(body: string, key: string): string | null {
  const startPattern = new RegExp(`\\b${key}:\\s*\\{`);
  const startMatch = startPattern.exec(body);
  if (!startMatch) {
    return null;
  }

  const blockStart = startMatch.index + startMatch[0].length;
  let depth = 1, pos = blockStart;
  while (pos < body.length && depth > 0) {
    if (body[pos] === "{") {
      depth++;
    }
    if (body[pos] === "}") {
      depth--;
    }
    pos++;
  }
  return body.slice(blockStart, pos - 1);
}

function serializeBody(v: IrisConfig): string {
  const lines: string[] = [];
  const add = (key: string, val: string) => lines.push(`  ${key}: ${val},`);

  add("N",            String(v.N));
  add("pinDistance",  String(v.pinDistance));
  add("slotOffset",   v.slotOffset.toFixed(6));
  add("bladeLength",  String(v.bladeLength));
  add("bladeWidth",   String(v.bladeWidth));
  add("openFStop",    v.openFStop.toFixed(1));
  add("defaultFStop", v.defaultFStop.toFixed(1));
  add("size",         String(v.size));

  if (v.strokeWidth !== undefined) {
    add("strokeWidth", v.strokeWidth.toFixed(2));
  }
  if (v.bladeColor  !== undefined) {
    add("bladeColor",  `"${v.bladeColor}"`);
  }
  if (v.strokeColor !== undefined) {
    add("strokeColor", `"${v.strokeColor}"`);
  }

  if (v.closedFStop !== undefined) {
    add("closedFStop", String(v.closedFStop));
  }

  if (v.interactive !== undefined) {
    if (v.interactive.type === "hover") {
      const h = v.interactive;
      const inner: string[] = [`    type: "hover",`];
      if (h.hotzoneScaleH !== undefined) {
        inner.push(`    hotzoneScaleH: ${h.hotzoneScaleH.toFixed(2)},`);
      }
      if (h.hotzoneScaleV !== undefined) {
        inner.push(`    hotzoneScaleV: ${h.hotzoneScaleV.toFixed(2)},`);
      }
      if (h.easeOutMs     !== undefined) {
        inner.push(`    easeOutMs: ${h.easeOutMs},`);
      }
      if (h.catchupMs     !== undefined) {
        inner.push(`    catchupMs: ${h.catchupMs},`);
      }
      lines.push(`  interactive: {\n${inner.join("\n")}\n  },`);
    } else if (v.interactive.type === "tap") {
      const t = v.interactive;
      if (t.animation.type === "sweep") {
        lines.push(
          `  interactive: {\n` +
          `    type: "tap",\n` +
          `    animation: { type: "sweep", sweepMs: ${t.animation.sweepMs}, totalMs: ${t.animation.totalMs} },\n` +
          `  },`
        );
      }
    }
  }
  if (v.apertureStrip !== undefined) {
    add("apertureStrip", String(v.apertureStrip));
  }

  if (v.onMount !== undefined && v.onMount.type === "sweep") {
    add("onMount", `{ type: "sweep", sweepMs: ${v.onMount.sweepMs}, totalMs: ${v.onMount.totalMs} }`);
  }

  if (v.chaseTauMs !== undefined) {
    add("chaseTauMs", String(v.chaseTauMs));

  }

  return "\n" + lines.join("\n") + "\n";
}

export async function readFromConfig(
  presetName: "IRIS_HERO" | "IRIS_NAV" | "IRIS_LAB",
): Promise<IrisConfig | null> {
  try {
    const content = await readFile(CONFIG_PATH, "utf-8");
    const range = findPresetBody(content, presetName);
    if (!range) {
      return null;
    }

    const body = content.slice(range.bodyStart, range.bodyEnd);

    function extractNum(key: string, src = body): number | undefined {
      const m = new RegExp(`\\b${key}:\\s*([\\d.]+)`).exec(src);
      return m ? parseFloat(m[1]) : undefined;
    }
    function extractStr(key: string): string | undefined {
      const m = new RegExp(`\\b${key}:\\s*"([^"]*)"`) .exec(body);
      return m ? m[1] : undefined;
    }
    function extractAnimation(key: string, src = body): IrisAnimation | undefined {
      const m = new RegExp(`\\b${key}:\\s*\\{[^}]*type:\\s*"sweep"[^}]*sweepMs:\\s*(\\d+)[^}]*totalMs:\\s*(\\d+)`).exec(src);
      if (m) {
        return { type: "sweep", sweepMs: parseInt(m[1]), totalMs: parseInt(m[2]) };
      }
      return undefined;
    }
    function extractInteractive(): IrisInteractiveMode | undefined {
      const block = extractObjectBlock(body, "interactive");
      if (!block) {
        return undefined;
      }

      const typeMatch = /\btype:\s*"(hover|tap)"/.exec(block);
      if (!typeMatch) {
        return undefined;
      }

      if (typeMatch[1] === "hover") {
        return {
          type: "hover",
          hotzoneScaleH: extractNum("hotzoneScaleH", block),
          hotzoneScaleV: extractNum("hotzoneScaleV", block),
          easeOutMs:     extractNum("easeOutMs",     block),
          catchupMs:     extractNum("catchupMs",     block),
        };
      }
      if (typeMatch[1] === "tap") {
        const anim = extractAnimation("animation", block);
        if (!anim) {
          return undefined;
        }
        return { type: "tap", animation: anim };
      }
      return undefined;
    }

    const N = extractNum("N");
    const pinDistance  = extractNum("pinDistance");
    const slotOffset   = extractNum("slotOffset");
    const bladeLength  = extractNum("bladeLength");
    const bladeWidth   = extractNum("bladeWidth");
    const openFStop    = extractNum("openFStop");
    const defaultFStop = extractNum("defaultFStop");
    const size         = extractNum("size");

    if (N === undefined || pinDistance === undefined || slotOffset === undefined ||
        bladeLength === undefined || bladeWidth === undefined || openFStop === undefined ||
        defaultFStop === undefined || size === undefined) {
      return null;
    }

    return {
      N:            Math.round(N),
      pinDistance,
      slotOffset,
      bladeLength,
      bladeWidth,
      openFStop,
      defaultFStop,
      size:         Math.round(size),
      strokeWidth:  extractNum("strokeWidth"),
      bladeColor:   extractStr("bladeColor"),
      strokeColor:  extractStr("strokeColor"),
      closedFStop:  extractNum("closedFStop"),
      interactive:  extractInteractive(),
      onMount:      extractAnimation("onMount"),
      chaseTauMs:   extractNum("chaseTauMs"),
    };
  } catch {
    return null;
  }
}

// Runs tsc after writing and restores the original on failure.
export async function exportToConfig(
  presetName: "IRIS_HERO" | "IRIS_NAV" | "IRIS_LAB",
  values: IrisConfig,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const originalContent = await readFile(CONFIG_PATH, "utf-8");
    const range = findPresetBody(originalContent, presetName);
    if (!range) {
      return { ok: false, error: `${presetName} not found in iris-config.ts` };
    }

    const newContent =
      originalContent.slice(0, range.bodyStart) +
      serializeBody(values) +
      originalContent.slice(range.bodyEnd);

    await writeFile(CONFIG_PATH, newContent, "utf-8");

    try {
      await execAsync("pnpm exec tsc --noEmit", { cwd: process.cwd() });
    } catch (tscErr: unknown) {
      await writeFile(CONFIG_PATH, originalContent, "utf-8");
      const e = tscErr as { stderr?: string; stdout?: string };
      const output = e.stdout || e.stderr || String(tscErr);
      return { ok: false, error: `TypeScript error after export:\n${output}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
