import type { SiteTopic } from "@/lib/site-facts";

export interface SiteFact {
  id: string;
  topic: SiteTopic;
  text: string;
  /** Files or folders this fact restates; editing them prompts a re-check (scripts/hooks/site-facts-review.mjs). */
  sources?: string[];
}

/**
 * Facts only the author can decide: policies, commitments, and who runs the site. Iris tells any
 * visitor everything here, so an entry is what Atlens wants any visitor to know, stated as a fact
 * about Atlens; how Iris should answer belongs in system-prompt.ts. Facts that code or data already hold are
 * generated in index.ts instead. A `{Namespace.key}` placeholder becomes that UI string in the user's language, so names match what the site shows.
 */
export const HANDWRITTEN_FACTS: SiteFact[] = [
  {
    id: "author",
    topic: "project",
    text: "Atlens is built and maintained by one independent developer, {About.authorName}, whose GitHub is linked at the top right of the site.",
  },
  {
    id: "former-name",
    topic: "project",
    text: "Atlens was previously called X-Glass; it is the same project by the same author, renamed for a simpler, more readable name.",
  },
  {
    id: "launch",
    topic: "project",
    text: "Atlens launched on 2026-04-28, less than a month after development began.",
  },
  {
    id: "contact",
    topic: "project",
    text: "Anyone can contact the author at me@atlens.app. For data problems, missing lenses, or feature ideas, the site's \"{Nav.feedback}\" form is the quickest route.",
  },
  {
    id: "open-source",
    topic: "project",
    text: "The site's source code is public under the MIT license. The lens data has its own license (LICENSE-DATA): it may be viewed for personal, non-commercial reference; copying or redistributing it, building a competing product or training models with it, commercial use, and bulk scraping all need written permission from me@atlens.app. The data pipeline is private and will not be open-sourced.",
    sources: ["LICENSE-DATA"],
  },
  {
    id: "plans",
    topic: "project",
    text: "Atlens keeps being updated, and feature requests are welcome through Feedback. There are no plans for now to add other camera mounts; the existing X and G mounts will gain more brands.",
  },
  {
    id: "liability",
    topic: "project",
    text: "Atlens takes no responsibility for decisions made based on information on the site.",
  },
  {
    id: "copyright",
    topic: "project",
    text: "Product images and brand trademarks shown on the site belong to their respective owners. Rights holders who believe something infringes their rights can contact me@atlens.app.",
  },
  {
    id: "origin",
    topic: "story",
    text: "The author is a Fujifilm shooter who found lens information too scattered: choosing a lens meant combing through every brand's website, official stores, and accounts, while reviews and creators' videos mostly offer opinions and steer a purchase rather than objectively showing how many lenses fit a need — which the author sees as the first step in choosing a lens.",
  },
  {
    id: "what-it-is",
    topic: "story",
    text: "Atlens catalogs lenses and collects manufacturers' official specs through a standardized data pipeline, building a multi-brand, normalized database where lenses can be compared side by side. It started with X mount only; G mount was added later at users' request.",
  },
  {
    id: "author-values",
    topic: "story",
    text: "The author wants Atlens to make no compromises on engineering quality, user experience, or visual design, and that conviction is a large part of why one person built it.",
  },
  {
    id: "built-with-ai",
    topic: "story",
    text: "The author built Atlens alone with AI tools; without large language models and AI coding agents, a project this size would hardly have shipped in under a month. Claude Code handled architecture and engineering. Claude Design and Google Gemini advised on design and branding: the interaction language of single- and multi-select controls in the filter panel, the card layout and spacing of the lens list across screen sizes, and the clean, restrained style of the share poster came out of working with them. The author could often feel that something in the interface was off without knowing why; Gemini helped name the problem and explain why the fix worked.",
  },
  {
    id: "iris-name",
    topic: "story",
    text: "Iris is named after the aperture mechanism inside a lens: a ring of pivoting blades that close and open like petals, called an iris diaphragm, or iris. The term comes from the iris of the human eye, since both expand and contract to control how much light gets through.",
  },
  {
    id: "iris-character",
    topic: "story",
    text: "Iris is Atlens's resident character: the aperture animation on the home page that opens and closes with a tap, which also appears in Ask Iris conversations and when feedback is sent. Like Clippy once lived in the corner of Microsoft Office, Iris keeps every visitor company in a quiet way, with a personality of its own. The site's built-in AI assistant takes its name: Ask Iris.",
  },
  {
    id: "iris-mechanics",
    topic: "story",
    text: "The animation is computed in real time from a real aperture's mechanics rather than drawn in advance: each blade pivots on a pin in the base plate, a guide pin at its other end rides in a slot of the actuator ring, and turning the ring opens and closes all blades together. It is a three-body constraint kinematic model that solves forward and inverse kinematics analytically in real time, with the opening's shape computed from where the blades' arcs intersect. Claude Code studied structural diagrams, motion principles, and kinematics material on petal-shaped aperture blades before modeling it; the author has no background in mechanism kinematics, and Claude built the whole model from scratch.",
    sources: ["src/lib/iris/kinematics.ts"],
  },
  {
    id: "free",
    topic: "business",
    text: "Atlens is completely free on both the Chinese and the English site. There are no plans for paid tiers or memberships at present.",
  },
  {
    id: "costs",
    topic: "business",
    text: "The author pays the running costs personally: hosting, the AI model behind Ask Iris, and data upkeep — a pipeline that collects, organizes, and calibrates specs from dozens of manufacturers' sites and samples prices, which takes ongoing work.",
  },
  {
    id: "ads",
    topic: "business",
    text: "Atlens currently has no ads.",
  },
  {
    id: "independence",
    topic: "business",
    text: "Atlens is an independent third-party tool, not endorsed or sponsored by Fujifilm or any other manufacturer. Its only commercial ties are the affiliate links among the English site's store links, some of which go to brands' own online stores. Affiliate links do not affect how lenses are ranked, the prices shown, or Iris's answers and recommendations, and no manufacturer can pay to change any of them.",
    sources: ["src/lib/purchase/channel-priority.ts"],
  },
  {
    id: "spec-source",
    topic: "data",
    text: "Specs are taken from manufacturers' official websites; no value is generated by AI. Fields that follow strictly from the model name, such as focal length and aperture, are computed in code; other fields are extracted by AI from the official text and stay traceable to it. For the rare field an official page lacks, the author may fill it at review from other published sources such as media and blogs. The author reviews every lens before it is published.",
  },
  {
    id: "pipeline",
    topic: "data",
    text: "Lens data comes from a pipeline: it lists each brand's lenses from its official site; collects each lens's official product page, product photo, and the product text on those pages; has AI audit the quality of that text; has AI turn the text into structured fields, while fields that follow from the model name are computed in code; samples prices and processes product photos; and publishes only after the author's review. User reports and new releases found by a monthly automated search all enter one GitHub Issues work queue. The full pipeline diagram is in the README of Atlens's GitHub repository.",
    sources: ["README.md"],
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
    id: "data-accuracy",
    topic: "data",
    text: "Atlens covers hundreds of lenses across dozens of spec fields, so a few errors or stale entries are unavoidable. Key specs should be confirmed on the manufacturer's site before buying.",
  },
  {
    id: "corrections",
    topic: "data",
    text: "Data errors can be reported with \"{Nav.feedback}\" or the \"{LensDetail.reportIssue}\" button on a lens page. Fixes usually take 2–4 weeks, because one person maintains the site part-time.",
  },
  {
    id: "price-nature",
    topic: "prices",
    text: "Prices are sampled snapshots, not live quotes, and are re-sampled only every six months to a year. New prices come from brand-official stores; where a brand has no global store, its US store is used. Where no official listing exists, used prices are the median of several second-hand listings and vary a lot with condition. The current price is on the store's own page.",
  },
  {
    id: "store-links",
    topic: "prices",
    text: "Broken store links or links to the wrong model can be reported through \"{Nav.feedback}\".",
  },
  {
    id: "iris-growing",
    topic: "askIris",
    text: "Ask Iris keeps gaining capabilities and will support more interactions around lens data and using the site.",
  },
  {
    id: "capabilities",
    topic: "askIris",
    text: "What Iris can do: find and recommend lenses for a need, as cards with a reason for each; lay lenses side by side in a spec table; explain how lenses differ; look up any lens's specs; for signed-in users, take their saved gear into account and ask them to add it when missing; answer questions about Atlens itself.",
  },
  {
    id: "model-provider",
    topic: "askIris",
    text: "Ask Iris runs on a third-party AI model, which may change. Atlens does not name the provider or the model.",
  },
  {
    id: "training",
    topic: "askIris",
    text: "Atlens itself does not use conversations to train models; how the AI provider handles the data it receives is governed by that provider's own policies and terms. Messages and replies are kept as service records to run the service, troubleshoot, evaluate reply quality, and improve the feature. Atlens asks users not to enter passwords, ID numbers, payment, health, or other sensitive personal information.",
  },
  {
    id: "rate-limit",
    topic: "askIris",
    text: "Ask Iris has usage limits to keep costs under control.",
    sources: ["src/lib/rate-limit.ts"],
  },
  {
    id: "accuracy",
    topic: "askIris",
    text: "Iris can be wrong and only knows what Atlens has collected; Atlens recommends checking key specs and purchase details with the manufacturer.",
  },
  {
    id: "sign-in-methods",
    topic: "account",
    text: "Sign-in is with a Google account or an email verification code.",
    sources: ["src/lib/auth.ts"],
  },
  {
    id: "conversation-storage",
    topic: "account",
    text: "Signed out, Ask Iris conversations are linked to this browser and move to the account on sign-in. Signed in, they are kept in the account, on every device, until the user deletes them or the account.",
  },
  {
    id: "delete-account",
    topic: "account",
    text: "To delete an account: open the account menu, choose \"{Auth.deleteAccount}\", and confirm with the link sent by email. Conversations, favorites, and gear are deleted with it.",
  },
  {
    id: "cookies",
    topic: "privacy",
    text: "Cookies: a session cookie that keeps the user signed in, which Ask Iris also uses for a signed-out conversation so it stays with this browser; a 30-minute anonymous analytics session cookie, not linked to any account; and small cookies that remember the language, region, and dismissed banners.",
    sources: ["src/lib/analytics/session.ts", "src/lib/locale-preference.ts", "src/hooks/useCountryCode.ts"],
  },
  {
    id: "analytics",
    topic: "privacy",
    text: "Atlens uses Cloudflare Web Analytics and its own event statistics on Cloudflare. Usage statistics record no IP address and are not linked to accounts, only to a random 30-minute session ID. Ask Iris statistics are anonymized before they are recorded. Service logs keep no cookies, IP addresses, or sign-in credentials.",
    sources: ["src/lib/analytics/"],
  },
  {
    id: "storage",
    topic: "privacy",
    text: "Data is stored on Cloudflare. Conversations are linked to the account so they can be found again. The \"{About.privacyTitle}\" section of the \"{Nav.about}\" page describes what is stored.",
  },
  {
    id: "mounts",
    topic: "usage",
    text: "\"{MountSwitcher.x}\" is Fujifilm's APS-C system and \"{MountSwitcher.gfx}\" is its GFX medium-format system. The mount is switched in the navigation bar. \"{MountSwitcher.gfx}\" coverage and features are still being filled in.",
  },
];
