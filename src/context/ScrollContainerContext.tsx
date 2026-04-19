"use client";

import { createContext, useContext, useState } from "react";

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

  return (
    <ScrollContainerContext.Provider value={{ navLocked, lockNav: setNavLocked }}>
      {children}
    </ScrollContainerContext.Provider>
  );
}

export function useNavLock() {
  const { navLocked, lockNav } = useContext(ScrollContainerContext);
  return { navLocked, lockNav };
}
