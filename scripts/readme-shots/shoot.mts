#!/usr/bin/env node
// Captures the README screenshots from production as the screenshot account and composites them:
// desktop pages on a soft backdrop, phone pages in iPhone frames, three to a row.
// Usage: node --experimental-strip-types scripts/readme-shots/shoot.mts [out-dir]

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE = process.env.SHOTS_BASE_URL ?? "https://atlens.app";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const AUTH = process.env.SHOTS_AUTH_FILE ?? path.join(HERE, ".auth.json");

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 402, height: 874 };
const STATUS_BAR = 54;
const HOME_INDICATOR = 34;
const DESK_CANVAS = { width: DESKTOP.width + 64, height: DESKTOP.height + 64 };
const ROW_CANVAS = { width: 3 * (PHONE.width + 28) + 2 * 80 + 80, height: PHONE.height + 28 + 64 };

const COMPARE_35 = [
  "fujifilm-xf-23mmf14-r-lm-wr-x",
  "fujifilm-xf-23mmf2-r-wr-x",
  "sigma-contemporary-23mm-f14-dc-dn-x",
  "viltrox-af-25mm-f17-air-x",
].join(",");
const BROWSE = "/en/lenses/x/browse?b=fujifilm,sigma,viltrox&t=prime&f=auto&sort=maxAperture";
const LENS = "/en/lenses/x/fujifilm-xf-33mmf14-r-lm-wr-x";

type Prepare = (page: Page) => Promise<void>;

interface Shot {
  path: string;
  prepare?: Prepare;
}

const scrollTo = (heading: string, byText = false): Prepare => async (page) => {
  const target = byText ? page.getByText(heading, { exact: true }) : page.getByRole("heading", { name: heading, exact: true });
  await target.first().evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(300);
  // A separate upward scroll: the phone nav hides while scrolling down and comes back on the way up.
  await page.evaluate(() => window.scrollBy(0, -150));
};

const click = (name: string | RegExp): Prepare => async (page) => {
  await page.getByRole("button", { name }).first().click();
  await page.waitForTimeout(1500);
};

// README screenshots: each desktop scene is one image; the phone scenes share one row.
const DESKTOP_SCENES: Record<string, Shot> = {
  "desktop-browse": { path: BROWSE },
  "desktop-compare": { path: `/en/lenses/x/compare?ids=${COMPARE_35}` },
  "desktop-lens": { path: LENS },
  "desktop-timeline": { path: "/en/lenses/x/charts/timeline" },
  "desktop-iris": { path: BROWSE, prepare: click(/^Ask Iris/) },
  "desktop-profile": { path: "/en/me" },
};

const PHONE_ROW: Shot[] = [
  { path: "/en" },
  { path: "/en/lenses/x/charts/weight", prepare: scrollTo("Cannons", true) },
  { path: LENS, prepare: scrollTo("What reviews say") },
];

const HIDE_CSS = `
  section[aria-labelledby="revisit-prompt-title"], [data-sonner-toaster] { display: none !important; }
  html { scrollbar-width: none !important; } ::-webkit-scrollbar { display: none !important; }
  *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; caret-color: transparent !important; }
`;

// Headless Chromium reports no safe areas; set the ones an iPhone in standalone mode has.
const PHONE_CSS = `:root { --safe-inset-top: ${STATUS_BAR}px !important; --safe-inset-bottom: ${HOME_INDICATOR}px !important; }`;

// The screenshot account's drawn avatar; the others in avatars/ are alternatives to switch to.
const AVATAR = process.env.SHOTS_AVATAR ?? "bright";

async function avatarDataUrl(): Promise<string> {
  const svg = await readFile(path.join(HERE, "avatars", `${AVATAR}.svg`));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

async function newContext(browser: Browser, phone: boolean, avatar: string): Promise<BrowserContext> {
  if (!existsSync(AUTH)) {
    throw new Error(`Missing ${AUTH}: export the screenshot account's session first.`);
  }
  const context = await browser.newContext({
    storageState: AUTH,
    locale: "en-US",
    colorScheme: "light",
    reducedMotion: "reduce",
    ...(phone
      ? {
          viewport: PHONE,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        }
      : { viewport: DESKTOP, deviceScaleFactor: 2 }),
  });
  await context.route(/\/api\/(track|telemetry)|cloudflareinsights\.com/, (route) => route.abort());
  await context.route("**/api/auth/get-session**", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (body?.user) {
      body.user.image = avatar;
    }
    await route.fulfill({ response, json: body });
  });
  await context.addInitScript((css) => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    });
  }, phone ? HIDE_CSS + PHONE_CSS : HIDE_CSS);
  return context;
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((img) => !img.complete && img.loading !== "lazy")
        .map((img) => new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        })),
    );
  });
  await page.waitForTimeout(800);
}

async function capture(context: BrowserContext, shot: Shot): Promise<Buffer> {
  const page = await context.newPage();
  await page.goto(BASE + shot.path, { waitUntil: "domcontentloaded" });
  await settle(page);
  if (shot.prepare) {
    await shot.prepare(page);
    await settle(page);
  }
  const png = await page.screenshot({ type: "png" });
  await page.close();
  return png;
}

const STATUS_ICONS = `
  <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
  <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.2 10.2 0 0 0 8 .8 10.2 10.2 0 0 0 .8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.5c1.3 0 2.5.5 3.5 1.3l1.2-1.3A7 7 0 0 0 8 4.3a7 7 0 0 0-4.7 1.8l1.2 1.3c1-.8 2.2-1.3 3.5-1.3Zm0 3.4c.5 0 1 .2 1.3.5L8 11.4 6.7 10c.3-.3.8-.5 1.3-.5Z"/></svg>
  <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".5"/></svg>`;

function phoneHtml(src: string) {
  return `<div class="phone"><div class="screen"><img src="${src}">
    <div class="status"><span>9:41</span><span class="icons">${STATUS_ICONS}</span></div>
    <div class="island"></div></div></div>`;
}

const COMPOSE_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body { font-family: -apple-system, "SF Pro Text", "Inter", system-ui, sans-serif; }
  .desk { width: ${DESK_CANVAS.width}px; height: ${DESK_CANVAS.height}px; padding: 16px 32px 48px; }
  .desk img { width: ${DESKTOP.width}px; height: ${DESKTOP.height}px; border-radius: 14px; display: block;
    box-shadow: 0 0 0 1px rgb(0 0 0 / .07), 0 14px 32px -10px rgb(0 0 0 / .28); }
  .row { width: ${ROW_CANVAS.width}px; height: ${ROW_CANVAS.height}px; padding: 16px 40px 48px; display: flex; justify-content: center; gap: 80px; }
  .phone { width: ${PHONE.width + 28}px; height: ${PHONE.height + 28}px; padding: 14px; border-radius: 68px;
    background: linear-gradient(145deg, #3a3a3e, #1c1c1f 40%, #2b2b2f); box-shadow: inset 0 0 0 2px #4a4a50, 0 18px 32px -12px rgb(0 0 0 / .4); position: relative; }
  .screen { width: 100%; height: 100%; border-radius: 54px; overflow: hidden; background: #fff; position: relative; }
  .status { position: absolute; inset: 0 0 auto; height: ${STATUS_BAR}px; display: flex; align-items: center; justify-content: space-between; padding: 6px 34px 0 46px;
    font-weight: 600; font-size: 17px; color: #000; }
  .icons { display: flex; gap: 6px; align-items: center; } .icons svg { fill: currentColor; }
  .screen img { width: ${PHONE.width}px; height: ${PHONE.height}px; display: block; }
  .island { position: absolute; top: 11px; left: 50%; width: 124px; height: 36px; margin-left: -62px; border-radius: 20px; background: #000; }`;

async function compose(browser: Browser, html: string, size: { width: number; height: number }): Promise<Buffer> {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><style>${COMPOSE_CSS}</style>${html}`);
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
  const png = await page.screenshot({ type: "png", omitBackground: true });
  await page.close();
  return png;
}

const dataUrl = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

async function main() {
  const outDir = process.argv[2] ?? path.resolve(HERE, "../../docs/screenshots");
  await mkdir(outDir, { recursive: true });
  const avatar = await avatarDataUrl();
  const browser = await chromium.launch();

  const desktop = await newContext(browser, false, avatar);
  for (const [name, shot] of Object.entries(DESKTOP_SCENES)) {
    const raw = await capture(desktop, shot);
    await writeFile(path.join(outDir, `${name}.png`), await compose(browser, `<div class="desk"><img src="${dataUrl(raw)}"></div>`, DESK_CANVAS));
    console.log(`✓ ${name}`);
  }
  await desktop.close();

  const phone = await newContext(browser, true, avatar);
  const shots: string[] = [];
  for (const shot of PHONE_ROW) {
    shots.push(dataUrl(await capture(phone, shot)));
  }
  await writeFile(path.join(outDir, "mobile.png"), await compose(browser, `<div class="row">${shots.map(phoneHtml).join("")}</div>`, ROW_CANVAS));
  console.log("✓ mobile");
  await phone.close();
  await browser.close();
}

await main();
