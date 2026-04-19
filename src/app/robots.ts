import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/design-lab/", "/api/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
