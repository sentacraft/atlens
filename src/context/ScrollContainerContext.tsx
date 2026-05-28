"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface ScrollContainerContextValue {
  navLocked: boolean;
  lockNav: (locked: boolean) => void;
  navHidden: boolean;
  setNavHidden: (hidden: boolean) => void;
}

const ScrollContainerContext = createContext<ScrollContainerContextValue>({
  navLocked: false,
  lockNav: () => {},
  navHidden: false,
  setNavHidden: () => {},
});

export function ScrollContainerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navLocked, setNavLocked] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const value = useMemo(
    () => ({ navLocked, lockNav: setNavLocked, navHidden, setNavHidden }),
    [navLocked, navHidden]
  );

  return (
    <ScrollContainerContext value={value}>
      {children}
    </ScrollContainerContext>
  );
}

export function useNav() {
  return useContext(ScrollContainerContext);
}
