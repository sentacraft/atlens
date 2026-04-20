import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import RegisterSW from "@/components/RegisterSW";

const sourceSerif4 = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-source-serif-4",
});

export const metadata: Metadata = {
  metadataBase: process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : new URL("http://localhost:3000"),
  verification: {
    google: "ou7kky4gmKroC87dxmfS3xjA7gqjXkNcZaKbtIRCflQ",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${GeistSans.variable} ${GeistMono.variable} ${sourceSerif4.variable} font-sans antialiased`}>
      <body>
        {children}
        <RegisterSW />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
