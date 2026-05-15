"use client";

import { useState, useEffect } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { setShown(true); }, []);
  return (
    <div
      className="transition-opacity duration-200"
      style={{ opacity: shown ? 1 : 0 }}
    >
      {children}
    </div>
  );
}
