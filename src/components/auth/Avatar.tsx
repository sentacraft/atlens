"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

export default function Avatar({
  name,
  email,
  image,
  className,
}: {
  name: string;
  email: string;
  image: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-100 font-semibold text-zinc-600",
        className,
      )}
    >
      {image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote avatar; images are unoptimized on Workers
        <img
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name, email)
      )}
    </span>
  );
}
