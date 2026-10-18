import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import NavProgress from "@/components/nav/NavProgress";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import RegisterSW from "@/components/pwa/RegisterSW";
import AssetTelemetry from "@/components/telemetry/AssetTelemetry";
import OutboundLinkTelemetry from "@/components/telemetry/OutboundLinkTelemetry";
import PwaLaunchTelemetry from "@/components/telemetry/PwaLaunchTelemetry";
import AnalyticsSessionSync from "@/components/telemetry/AnalyticsSessionSync";
import SiteJsonLd from "@/components/seo/SiteJsonLd";
import { routing } from "@/i18n/routing";
import Nav from "@/components/nav/Nav";
import ConsoleEgg from "@/components/ConsoleEgg";
import { meta, brandCount } from "@/lib/lens/data";
import Redaction from "@/components/Redaction";
import TestHookPanel from "@/components/TestHookPanel";
import { agentModelInfo } from "@/lib/ai/model";
import { CompareProvider } from "@/context/CompareProvider";
import { MountPreferenceProvider } from "@/context/MountPreferenceProvider";
import { NavProvider } from "@/context/NavProvider";
import { IrisPanelProvider } from "@/context/IrisPanelProvider";
import { SignInDialogProvider } from "@/context/SignInDialogProvider";
import { TestHookProvider } from "@/context/TestHookProvider";
import { TESTHOOK_ALLOWED } from "@/lib/testhook";
import { SITE } from "@/config/site";
import { SPLASH_DEVICES, splashUrl, splashMedia } from "@/config/splash";
import AppToaster from "@/components/AppToaster";
import RenameToast from "@/components/RenameToast";
import QueryProvider from "@/components/providers/QueryProvider";
import LocalePreferenceSync from "@/components/me/LocalePreferenceSync";
import { fontClassName } from "../fonts";
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
    metadataBase: new URL(SITE.url),
    title: {
      default: t("seoTitle"),
      template: "%s | Atlens",
    },
    description: t("seoDescription"),
    verification: {
      google: "ou7kky4gmKroC87dxmfS3xjA7gqjXkNcZaKbtIRCflQ",
    },
    // Setting `icons` disables file-convention discovery, so every icon must be listed. The
    // apple-touch-icon has a baked white background: iOS's fill for transparent pixels is unreliable.
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
        { url: "/icon.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    // iOS Safari turns emails, phone-like numbers and addresses into links on its own, so the
    // profile's email and figures such as prices and lens counts became tappable.
    formatDetection: { email: false, telephone: false, address: false },
    appleWebApp: {
      capable: true,
      title: SITE.shortName,
      statusBarStyle: "black-translucent",
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
    // iOS still gates startup images on the legacy apple- tag, which Next 15+ no longer emits.
    // https://github.com/vercel/next.js/issues/74524
    other: {
      "apple-mobile-web-app-capable": "yes",
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="pt-[var(--nav-height)] pb-[var(--safe-inset-bottom)] pr-[var(--iris-panel-width,0px)] min-h-svh">
      {children}
    </div>
  );
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  // Without it, translation access forces dynamic rendering.
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={fontClassName}>
      <body>
        {/* NavProgress uses useSearchParams, which would force a CSR bailout on static pages. */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <SiteJsonLd locale={locale} />
        <QueryProvider>
        <NextIntlClientProvider messages={messages}>
          <MountPreferenceProvider>
          <LocalePreferenceSync />
          <CompareProvider>
          <SignInDialogProvider>
            <NavProvider>
            <IrisPanelProvider>
              <ConsoleEgg version={meta.version} lensCount={meta.lensCount} brandCount={brandCount} />
              {/* Redaction uses useSearchParams, which would force a CSR bailout on prerendered pages. */}
              <Suspense fallback={null}>
                <Redaction />
              </Suspense>
              {/* Base UI portals popups to <body>; isolating the page keeps them above any z-index in it (https://base-ui.com/react/overview/quick-start). */}
              <div className="isolate">
                {TESTHOOK_ALLOWED ? (
                  // Wraps Nav too: its NavMenu reads the persisted test hook state.
                  <TestHookProvider>
                    <Nav />
                    <PageFrame>
                      {children}
                      <TestHookPanel model={agentModelInfo()} />
                    </PageFrame>
                  </TestHookProvider>
                ) : (
                  <>
                    <Nav />
                    <PageFrame>{children}</PageFrame>
                  </>
                )}
              </div>
            </IrisPanelProvider>
            </NavProvider>
          </SignInDialogProvider>
          </CompareProvider>
          </MountPreferenceProvider>
          <AppToaster />
          <RenameToast />
        </NextIntlClientProvider>
        </QueryProvider>
        <RegisterSW />
        <AssetTelemetry />
        <OutboundLinkTelemetry />
        <PwaLaunchTelemetry />
        <AnalyticsSessionSync />
      </body>
    </html>
  );
}
