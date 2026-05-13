import { SITE } from "@/config/site";
import { routing } from "@/i18n/routing";

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;

// Brand alternate names — including the China-market 图鉴 variant — so Google
// learns that short queries like "xglass" or "富士镜头图鉴" resolve to this site.
const BRAND_ALTERNATE_NAMES = [
  "xglass",
  "x glass",
  "X Glass",
  "富士镜头图鉴",
  "X-Glass 富士镜头图鉴",
];

export default function SiteJsonLd({ locale }: { locale: string }) {
  const graph = [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE.name,
      alternateName: BRAND_ALTERNATE_NAMES,
      url: SITE.url,
      logo: {
        "@type": "ImageObject",
        url: `${SITE.url}/logo.png`,
        width: 1912,
        height: 1912,
      },
    },
    {
      "@type": "WebSite",
      "@id": SITE_ID,
      name: SITE.name,
      alternateName: BRAND_ALTERNATE_NAMES,
      url: `${SITE.url}/${locale}`,
      inLanguage: routing.locales,
      publisher: { "@id": ORG_ID },
    },
  ];

  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
