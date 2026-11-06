import { describe, expect, it } from "vitest";
import { classifyNetwork, classifyUserAgent, requestAttributes } from "../request-class";

describe("classifyNetwork", () => {
  it.each([
    ["Amazon.com, Inc.", "datacenter"],
    ["DigitalOcean, LLC", "datacenter"],
    ["T-Mobile USA, Inc.", "mobile"],
    ["Comcast Cable Communications, LLC", "other"],
  ])("%s -> %s", (organization, expected) => {
    expect(classifyNetwork(organization)).toBe(expected);
  });

  it("is null without an organization", () => {
    expect(classifyNetwork(undefined)).toBeNull();
  });
});

describe("classifyUserAgent", () => {
  it.each([
    ["Mozilla/5.0 (compatible; Googlebot/2.1)", "bot"],
    ["Mozilla/5.0 (iPhone) MicroMessenger/8.0", "in_app"],
    ["Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605", "browser"],
  ])("%s -> %s", (userAgent, expected) => {
    expect(classifyUserAgent(userAgent)).toBe(expected);
  });
});

describe("requestAttributes", () => {
  const headers = (map: Record<string, string>) => ({ get: (name: string) => map[name] ?? null });

  it("reads the country from cf, falling back to the header, and rejects junk", () => {
    expect(requestAttributes(headers({}), { country: "us" }).country).toBe("US");
    expect(requestAttributes(headers({ "cf-ipcountry": "CN" }), undefined).country).toBe("CN");
    expect(requestAttributes(headers({ "cf-ipcountry": "XX1" }), undefined).country).toBeNull();
  });
});
