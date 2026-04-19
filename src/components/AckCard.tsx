"use client";

import { useState } from "react";
import IrisTooltip from "@/components/IrisTooltip";

interface AckCardProps {
  roles: string[];
  company: string;
  product: string;
  logo: string;
  logoAlt: string;
  logoClassName: string;
  logoSize: number;
  glowColor: string;
  body: string;
  isClaudeCard?: boolean;
  locale?: string;
}

export default function AckCard({
  roles,
  company,
  product,
  logo,
  logoAlt,
  logoClassName,
  logoSize,
  glowColor,
  body,
  isClaudeCard,
  locale,
}: AckCardProps) {
  const [open, setOpen] = useState(false);
  const paragraphs = body.split("\n\n");

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`group w-full flex items-center gap-5 px-8 py-6 cursor-pointer select-none text-left rounded-2xl transition-[border-radius] duration-[0ms] ${
          open ? "rounded-b-none" : ""
        }`}
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`,
        }}
      >
        <div className="flex-1 text-right">
          {roles.map((role) => (
            <p
              key={role}
              className="text-[10px] tracking-widest uppercase text-zinc-400 dark:text-zinc-500 leading-5"
            >
              {role}
            </p>
          ))}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={logoAlt}
          width={logoSize}
          height={logoSize}
          className={`flex-shrink-0 ${logoClassName}`}
          loading="lazy"
        />
        <div className="flex-1 flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 whitespace-nowrap">
              {product}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{company}</p>
          </div>
          <span className="ml-auto flex items-center justify-center w-6 h-6 rounded-full transition-colors group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800">
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="currentColor"
              className={`flex-shrink-0 text-zinc-300 dark:text-zinc-600 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              <path d="M8 10.94 2.53 5.47l.94-.94L8 9.06l4.53-4.53.94.94L8 10.94Z" />
            </svg>
          </span>
        </div>
      </button>

      {/* Grid rows trick: animates height from 0 to auto */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transition: "grid-template-rows 0.28s ease, opacity 0.22s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="px-8 pb-10 pt-5 flex flex-col gap-3">
            {paragraphs.map((para, j) => {
              if (isClaudeCard && j === 0) {
                const parts = para.split("Iris");
                return (
                  <p key={j} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {parts.map((part, k) => (
                      <span key={k}>
                        {part}
                        {k < parts.length - 1 && <IrisTooltip>Iris</IrisTooltip>}
                      </span>
                    ))}
                  </p>
                );
              }
              return (
                <p key={j} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {para}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
