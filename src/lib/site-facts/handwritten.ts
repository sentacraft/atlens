import type { SiteTopic } from "@/lib/site-facts";

export interface SiteFact {
  id: string;
  topic: SiteTopic;
  text: string;
  /** Code this fact restates; re-check the fact when that code changes. */
  source?: string;
}

/**
 * Facts only the author can decide: policies, commitments, and who runs the site. Iris tells any
 * visitor everything here, so only public facts belong. Facts that code or data already hold are
 * generated in index.ts instead. `{author}` becomes the author's name as the user's locale writes it.
 */
export const HANDWRITTEN_FACTS: SiteFact[] = [
  {
    id: "author",
    topic: "project",
    text: "Atlens is built and maintained by one independent developer, {author}. Their location is not public and there is no personal homepage; the GitHub link is at the top right of the site.",
  },
  {
    id: "former-name",
    topic: "project",
    text: "Atlens was previously called X-Glass; it is the same project by the same author.",
  },
  { id: "launch", topic: "project", text: "Atlens launched on 2026-04-28." },
  {
    id: "contact",
    topic: "project",
    text: "Anyone can contact the author at me@atlens.app. For data problems or feature ideas, the site's Feedback form is the quickest route. No social media accounts are published.",
  },
  {
    id: "open-source",
    topic: "project",
    text: "The site's source code is public under the MIT license. The lens data has its own license (LICENSE-DATA): it may be viewed for personal, non-commercial reference; copying or redistributing it, building a competing product or training models with it, commercial use, and bulk scraping all need written permission from me@atlens.app. The data pipeline is private and will not be open-sourced.",
    source: "LICENSE-DATA",
  },
  {
    id: "plans",
    topic: "project",
    text: "Atlens keeps being updated, and feature requests are welcome through Feedback. It will not add other camera mounts; the existing X and G mounts will gain more brands. No other plans are public.",
  },
  {
    id: "free",
    topic: "business",
    text: "Atlens is completely free on both the Chinese and the English site. There are no plans for paid tiers or memberships at present; do not promise it will stay free forever.",
  },
  {
    id: "costs",
    topic: "business",
    text: "The author pays all running costs personally: hosting, keeping the data up to date, and the AI model behind Ask Iris. Affiliate commissions and tips bring in almost nothing so far.",
  },
  {
    id: "support",
    topic: "business",
    text: "Only when someone asks how to pay for or support Atlens: point them to the support section of the About page (Ko-fi and WeChat tips). Do not bring up support otherwise.",
  },
  { id: "ads", topic: "business", text: "Atlens has no ads at present. Say nothing about the future." },
  {
    id: "independence",
    topic: "business",
    text: "Atlens has no partnership or sponsorship with Fujifilm or any other manufacturer and is not endorsed by them. No commercial relationship, affiliate links included, affects what Iris recommends, how lenses are ranked, or the prices shown; manufacturers cannot pay to change rankings.",
    source: "src/lib/purchase/channel-priority.ts",
  },
  {
    id: "spec-source",
    topic: "data",
    text: "Specs come only from manufacturers' official websites. Fields that follow strictly from the model name, such as focal length and aperture, are computed in code; other fields are extracted by AI from the official text and stay traceable to it. Before publishing, a separate AI cross-checks samples against published reviews to catch source or extraction errors; those reviews are never used as data.",
  },
  {
    id: "inclusion",
    topic: "data",
    text: "A lens is listed once its manufacturer's official site has a product page for it; announced lenses without one are not listed yet, and discontinued lenses only while the official site still has their page. Brands users ask for most are added first.",
  },
  {
    id: "update-cadence",
    topic: "data",
    text: "New lenses are usually added in a batch about once a month; how soon a new lens appears depends on when its manufacturer publishes the product page.",
  },
  {
    id: "corrections",
    topic: "data",
    text: "Data errors can be reported with Feedback or the report button on a lens page. Fixes usually take 2–4 weeks, because one person maintains the site part-time.",
  },
  {
    id: "price-nature",
    topic: "prices",
    text: "Prices are sampled snapshots, not live quotes, and are re-sampled only every six months to a year. New prices come from brand-official stores; where a brand has no global store, its US store is used. Where no official listing exists, used prices are the median of several second-hand listings and vary a lot with condition. Always check the store for the current price.",
  },
  {
    id: "model-provider",
    topic: "askIris",
    text: "Ask Iris runs on a third-party AI model. Which provider and model is not disclosed, and it may change.",
  },
  {
    id: "training",
    topic: "askIris",
    text: "Atlens itself does not use conversations to train models; how the AI provider handles the data it receives is governed by that provider's own policies and terms. Messages and replies are kept as service records to run the service, troubleshoot, evaluate reply quality, and improve the feature. Users should not enter passwords, ID numbers, payment, health, or other sensitive personal information.",
  },
  {
    id: "rate-limit",
    topic: "askIris",
    text: "Ask Iris has usage limits to keep costs under control; anyone who hits one can try again a little later. The exact limits are not public.",
    source: "src/lib/rate-limit.ts",
  },
  {
    id: "accuracy",
    topic: "askIris",
    text: "Iris can be wrong and only knows what Atlens has collected; key specs and purchase details should be checked with the manufacturer.",
  },
  {
    id: "sign-in-methods",
    topic: "account",
    text: "Sign-in is with a Google account or an email verification code.",
    source: "src/lib/auth.ts",
  },
  {
    id: "conversation-storage",
    topic: "account",
    text: "Signed out, Ask Iris conversations are linked to this browser and move to the account on sign-in. Signed in, they are kept in the account, on every device, until the user deletes them or the account.",
  },
  {
    id: "delete-account",
    topic: "account",
    text: "To delete an account: open the account menu, choose Delete account, and confirm with the link sent by email. Conversations, favorites, and gear are deleted with it.",
  },
  {
    id: "cookies",
    topic: "privacy",
    text: "Cookies: a session cookie that keeps the user signed in, which Ask Iris also uses for a signed-out conversation so it stays with this browser; a 30-minute anonymous analytics session cookie, not linked to any account; and small cookies that remember the language, region, and dismissed banners.",
    source: "src/lib/analytics/session.ts, src/lib/locale-preference.ts, src/hooks/useCountryCode.ts",
  },
  {
    id: "analytics",
    topic: "privacy",
    text: "Atlens uses Cloudflare Web Analytics and its own event statistics on Cloudflare. Usage statistics record no IP address and are not linked to accounts, only to a random 30-minute session ID. Ask Iris statistics hash the conversation ID. Service logs keep no cookies, IP addresses, or sign-in credentials.",
    source: "src/lib/analytics/",
  },
  {
    id: "storage",
    topic: "privacy",
    text: "Data is stored on Cloudflare. Conversations are linked to the account so they can be found again, so not everything is anonymous. The About page's privacy section describes what is stored.",
  },
  {
    id: "app",
    topic: "usage",
    text: "There is no app-store app. Atlens can be installed as a web app (PWA) on a phone or computer from its install page.",
  },
  {
    id: "mounts",
    topic: "usage",
    text: "X mount is Fujifilm's APS-C system and G mount is its GFX medium-format system. The mount is switched in the navigation bar. G mount coverage and features are still being filled in.",
  },
];
