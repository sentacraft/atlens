"use client";

import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";

export const POSTER_WIDTH = 1080;

/**
 * The shared layout of every chart poster: a headline that works out of context, the chart, and a
 * footer pointing back to the live page.
 */
export default function PosterFrame({
  title,
  subtitle,
  cta,
  note,
  shareUrl,
  children,
}: {
  title: string;
  subtitle: string;
  cta: string;
  note: string;
  shareUrl: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Charts");
  return (
    <div
      className="flex flex-col bg-white font-sans text-zinc-900"
      style={{ width: POSTER_WIDTH, padding: "72px 48px 56px", gap: 36, boxSizing: "border-box" }}
    >
      <div className="flex flex-col" style={{ gap: 14 }}>
        <span className="uppercase text-zinc-500" style={{ fontSize: 20, letterSpacing: "0.16em" }}>
          {t("posterEyebrow")}
        </span>
        <h1 className="m-0 whitespace-pre-line font-heading font-bold" style={{ fontSize: 68, lineHeight: 1.08, letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        <p className="m-0 text-zinc-600" style={{ fontSize: 26, lineHeight: "36px" }}>
          {subtitle}
        </p>
      </div>
      <div>{children}</div>
      <div className="flex items-center justify-between border-t border-zinc-200" style={{ gap: 24, paddingTop: 24 }}>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <span className="font-heading font-bold" style={{ fontSize: 30 }}>
            Atlens
          </span>
          <span className="text-zinc-600" style={{ fontSize: 20 }}>
            {cta}
          </span>
          <span className="text-zinc-500" style={{ fontSize: 16 }}>
            {note}
          </span>
        </div>
        <div data-redact-hook="posterQr" style={{ width: 140, height: 140 }}>
          {shareUrl && (
            <QRCodeSVG
              value={shareUrl}
              size={140}
              level="H"
              style={{ display: "block" }}
              imageSettings={{ src: "/icons/icon-192-white.png", width: 26, height: 26, excavate: true }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
