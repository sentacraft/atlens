import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Nav from "@/components/Nav";
import ConsoleEgg from "@/components/ConsoleEgg";
import TestHookPanel from "@/components/TestHookPanel";
import { CompareProvider } from "@/context/CompareProvider";
import { ScrollContainerProvider } from "@/context/ScrollContainerContext";
import { TestHookProvider } from "@/context/TestHookProvider";
import { TESTHOOK_ALLOWED } from "@/lib/testhook";
import { SITE } from "@/config/site";
import { SPLASH_DEVICES, splashUrl, splashMedia } from "@/config/splash";
import "../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SITE.themeColor.light },
    { media: "(prefers-color-scheme: dark)",  color: SITE.themeColor.dark  },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: {
      default: t("seoTitle"),
      template: "%s | X-Glass",
    },
    description: t("seoDescription"),
    // Explicit icon declarations — setting `icons` in metadata disables Next.js
    // file-convention auto-discovery, so both `icon` and `apple` must be listed.
    // Safari requires an explicit favicon.ico link tag; it won't auto-discover it.
    // apple-touch-icon uses a pre-baked white background (icon-512-white.png @180px)
    // so iOS never has to fill transparent pixels — that fill color is unreliable
    // across iOS versions and was causing a recurring black-background bug.
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
        { url: "/icon.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    appleWebApp: {
      capable: true,
      title: SITE.shortName,
      statusBarStyle: "black-translucent",
      // One PNG per device × color-scheme so iOS shows a branded launch image
      // instead of a white flash during the WebKit startup gap.
      startupImage: SPLASH_DEVICES.flatMap((device) =>
        (["light", "dark"] as const).map((scheme) => ({
          url:   splashUrl(device.label, scheme),
          media: splashMedia(device, scheme),
        }))
      ),
    },
    openGraph: {
      siteName: SITE.name,
      type: "website",
      description: t("seoDescription"),
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    },
    // Next.js 15+ stopped emitting `apple-mobile-web-app-capable` in favour of
    // the standardised `mobile-web-app-capable` (see next.js PR #70363). iOS
    // Safari still gates the apple-touch-startup-image splash feature on the
    // legacy `apple-` tag, so we emit it explicitly here. See
    // https://github.com/vercel/next.js/issues/74524 for the upstream bug.
    other: {
      "apple-mobile-web-app-capable": "yes",
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <div lang={locale}>
      <NextIntlClientProvider messages={messages}>
        <CompareProvider>
          <ScrollContainerProvider>
            <ConsoleEgg />
            <Nav />
            {/* Offset fixed nav and iOS home indicator. Body also carries
                bg-background, so the safe-area strip and any short-page gap
                render as a single seamless canvas color. */}
            <div className="pt-[var(--nav-height)] pb-[var(--safe-inset-bottom)] min-h-svh">
              {TESTHOOK_ALLOWED ? (
                <TestHookProvider>
                  {children}
                  <TestHookPanel />
                </TestHookProvider>
              ) : (
                children
              )}
            </div>
          </ScrollContainerProvider>
        </CompareProvider>
      </NextIntlClientProvider>
    </div>
  );
}
