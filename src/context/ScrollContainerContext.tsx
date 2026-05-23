"use client";

import { createContext, useContext, useMemo, useState } from "react";

// navLocked: when true, Nav stays hidden regardless of scroll direction.
// Used by pages that have their own sticky header (e.g. CompareTable phantom header)
// so that only one top-chrome element is visible at a time.
interface ScrollContainerContextValue {
  navLocked: boolean;
  lockNav: (locked: boolean) => void;
}

const ScrollContainerContext = createContext<ScrollContainerContextValue>({
  navLocked: false,
  lockNav: () => {},
});

export function ScrollContainerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navLocked, setNavLocked] = useState(false);
  const value = useMemo(
    () => ({ navLocked, lockNav: setNavLocked }),
    [navLocked]
  );

  return (
    <ScrollContainerContext value={value}>
      {children}
    </ScrollContainerContext>
  );
}

export function useNavLock() {
  const { navLocked, lockNav } = useContext(ScrollContainerContext);
  return { navLocked, lockNav };
}
