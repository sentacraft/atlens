// Runs under `tsx --conditions=react-server`: the data modules import "server-only", which throws
// under the default conditions.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { routing } from "@/i18n/routing";
import { buildAskIrisChatData } from "@/lib/askiris/chat-data-source";

const dir = resolve(process.cwd(), "src/data");
mkdirSync(dir, { recursive: true });
for (const locale of routing.locales) {
  const data = buildAskIrisChatData(locale);
  writeFileSync(resolve(dir, `askiris-chat-data.${locale}.generated.json`), JSON.stringify(data));
  console.log(`✓ wrote askiris-chat-data.${locale}.generated.json (${data.lenses.length} lenses)`);
}
