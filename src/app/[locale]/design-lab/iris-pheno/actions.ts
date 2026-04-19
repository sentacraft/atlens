"use server";

import { writeFile, readFile } from "fs/promises";
import path from "path";

const PRESET_PATH = path.join(
  process.cwd(),
  "src/app/[locale]/design-lab/iris-pheno/preset.json",
);

const BRAND_PATH = path.join(process.cwd(), "src/config/brand.ts");

export async function savePreset(data: Record<string, number | boolean>) {
  await writeFile(PRESET_PATH, JSON.stringify(data, null, 2) + "\n");
}

export async function loadPreset(): Promise<Record<
  string,
  number | boolean
> | null> {
  try {
    const raw = await readFile(PRESET_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export interface BrandExportValues {
  N: number;
  t: number;
  halfSpread: number;
  overlap: number;
  curve: number;
  twist: number;
  bladeStrokeWidth: number;
  shadowStdDeviation: number;
}

/**
 * Read current numeric values from a named `export const <presetName> = { … }` block
 * in brand.ts. Returns null if the preset cannot be found or parsed.
 */
export async function readFromBrand(
  presetName: "IRIS_LG" | "IRIS_SM",
): Promise<BrandExportValues | null> {
  try {
    const content = await readFile(BRAND_PATH, "utf-8");

    const startPattern = new RegExp(`export const ${presetName}[^=]*=\\s*\\{`);
    const startMatch = startPattern.exec(content);
    if (!startMatch) return null;

    const bodyStart = startMatch.index + startMatch[0].length;
    let depth = 1, bodyEnd = bodyStart;
    while (bodyEnd < content.length && depth > 0) {
      if (content[bodyEnd] === "{") depth++;
      if (content[bodyEnd] === "}") depth--;
      bodyEnd++;
    }
    const body = content.slice(bodyStart, bodyEnd - 1);

    function extract(key: string): number {
      const m = new RegExp(`\\b${key}:\\s*([\\d.]+)`).exec(body);
      return m ? parseFloat(m[1]) : 0;
    }

    return {
      N:                  extract("N"),
      t:                  extract("t"),
      halfSpread:         extract("halfSpread"),
      overlap:            extract("overlap"),
      curve:              extract("curve"),
      twist:              extract("twist"),
      bladeStrokeWidth:   extract("bladeStrokeWidth"),
      shadowStdDeviation: extract("shadowStdDeviation"),
    };
  } catch {
    return null;
  }
}

/**
 * Patch numeric values inside a named `export const <presetName> = { … }` block
 * in brand.ts. Uses string replacement scoped to that object's body so
 * IRIS_LG and IRIS_SM don't interfere with each other.
 */
export async function exportToBrand(
  presetName: "IRIS_LG" | "IRIS_SM",
  values: BrandExportValues,
): Promise<{ ok: boolean; error?: string }> {
  try {
    let content = await readFile(BRAND_PATH, "utf-8");

    // Locate the object body for the target preset
    const startPattern = new RegExp(`export const ${presetName}[^=]*=\\s*\\{`);
    const startMatch = startPattern.exec(content);
    if (!startMatch) return { ok: false, error: `${presetName} not found in brand.ts` };

    const bodyStart = startMatch.index + startMatch[0].length;

    // Walk forward to find the matching closing brace
    let depth = 1;
    let bodyEnd = bodyStart;
    while (bodyEnd < content.length && depth > 0) {
      if (content[bodyEnd] === "{") depth++;
      if (content[bodyEnd] === "}") depth--;
      bodyEnd++;
    }

    // Patch each value with a regex that matches `key: <number>` (ignores JSDoc lines)
    let body = content.slice(bodyStart, bodyEnd - 1);
    const patch: Record<string, number> = {
      N:                  values.N,
      t:                  values.t,
      halfSpread:         values.halfSpread,
      overlap:            values.overlap,
      curve:              values.curve,
      twist:              values.twist,
      bladeStrokeWidth:   values.bladeStrokeWidth,
      shadowStdDeviation: values.shadowStdDeviation,
    };
    for (const [key, val] of Object.entries(patch)) {
      body = body.replace(
        new RegExp(`(\\b${key}:\\s*)[\\d.]+`),
        `$1${val}`,
      );
    }

    content = content.slice(0, bodyStart) + body + content.slice(bodyEnd - 1);
    await writeFile(BRAND_PATH, content, "utf-8");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
