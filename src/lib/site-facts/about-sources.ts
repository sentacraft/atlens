import { createHash } from "node:crypto";
import { HANDWRITTEN_FACTS } from "./handwritten.ts";

/**
 * Which site facts each About message restates, and a hash of those facts when the copy was last
 * reviewed. The About page is written from the facts; when a cited fact changes, the test in
 * __tests__/about-sources.test.ts and scripts/hooks/site-facts-review.mjs name the copy to re-review.
 */
export const ABOUT_FACT_SOURCES: Record<string, { facts: string[]; hash: string }> = {
  rebrandNote: { facts: ["former-name"], hash: "13cd2dc9d69f" },
  backgroundBody1: { facts: ["origin"], hash: "84cf88f1af5b" },
  backgroundBody2: { facts: ["what-it-is"], hash: "79ae52e52c60" },
  backgroundBody3: { facts: ["author", "author-values"], hash: "67a1d25aca36" },
  askIrisBody: { facts: ["capabilities", "iris-growing", "accuracy"], hash: "5153571743ad" },
  dataAccuracyCaveat: { facts: ["data-accuracy", "corrections"], hash: "656a7b395b5d" },
  dataAccuracyIntro: { facts: ["spec-source", "pipeline"], hash: "cf6cbe9fd289" },
  dataSpecPoint1Body: { facts: ["spec-source"], hash: "018ebb4141cd" },
  dataSpecPoint2Body: { facts: ["spec-source"], hash: "018ebb4141cd" },
  dataSpecPoint3Body: { facts: ["pipeline"], hash: "b63a0c3187a6" },
  dataSpecPoint4Body: { facts: ["spec-source"], hash: "018ebb4141cd" },
  dataUpdateNote: { facts: ["update-cadence"], hash: "378eff049849" },
  dataPricingPoint1Body: { facts: ["price-nature"], hash: "ec24238ddf8e" },
  dataPricingPoint2Body: { facts: ["price-nature"], hash: "ec24238ddf8e" },
  dataPricingPoint3Body: { facts: ["price-nature"], hash: "ec24238ddf8e" },
  dataPricingPoint4Body: { facts: ["price-nature"], hash: "ec24238ddf8e" },
  disclaimerAccuracy: { facts: ["data-accuracy", "spec-source"], hash: "6cfea469987b" },
  disclaimerLiability: { facts: ["liability"], hash: "8a461f89869b" },
  disclaimerIndependent: { facts: ["independence"], hash: "f33be3a7db11" },
  disclaimerCopyright: { facts: ["copyright"], hash: "a9413c262762" },
  privacyBody: { facts: ["conversation-storage", "training"], hash: "799eda3b98c6" },
  privacyAnalytics: { facts: ["analytics"], hash: "86c4dae8eb0d" },
  supportCost: { facts: ["costs"], hash: "39c24a54686a" },
  supportIntegrity: { facts: ["independence", "open-source", "store-links"], hash: "96e5b757879a" },
  ackBody: { facts: ["built-with-ai", "launch"], hash: "e232ef01c031" },
  ackStory1Body: { facts: ["iris-character", "iris-mechanics"], hash: "4965f89c49d0" },
  ackStory2Body: { facts: ["built-with-ai"], hash: "710d74f8bf27" },
};

/** The hash a group of facts has now; an About entry whose stored hash differs needs re-review. */
export function factsHash(ids: string[]): string {
  const text = new Map(HANDWRITTEN_FACTS.map((fact) => [fact.id, fact.text]));
  return createHash("sha256")
    .update(ids.map((id) => text.get(id) ?? "").join("\n"))
    .digest("hex")
    .slice(0, 12);
}

/** About messages whose cited facts changed since the copy was last reviewed. */
export function staleAboutCopy(): { key: string; facts: string[]; hash: string }[] {
  return Object.entries(ABOUT_FACT_SOURCES)
    .map(([key, { facts }]) => ({ key, facts, hash: factsHash(facts) }))
    .filter(({ key, hash }) => ABOUT_FACT_SOURCES[key].hash !== hash);
}
