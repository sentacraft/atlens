import { SITE } from "@/config/site";
import { routing } from "@/i18n/routing";
import JsonLd from "@/components/seo/JsonLd";

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;

// Legacy "X-Glass" names stay so searches for the former name still land here.
const BRAND_ALTERNATE_NAMES = [
  "atlens",
  "Atlens",
  "Atlens 富士镜头图鉴",
  "xglass",
  "x glass",
  "X Glass",
  "X-Glass",
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
      sameAs: [
        "https://github.com/sentacraft/atlens",
      ],
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

  return <JsonLd data={{ "@context": "https://schema.org", "@graph": graph }} />;
}
