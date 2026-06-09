"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface NavContextValue {
  navLocked: boolean;
  lockNav: (locked: boolean) => void;
  navHidden: boolean;
  setNavHidden: (hidden: boolean) => void;
}

const NavContext = createContext<NavContextValue>({
  navLocked: false,
  lockNav: () => {},
  navHidden: false,
  setNavHidden: () => {},
});

export function NavProvider({
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
    <NavContext value={value}>
      {children}
    </NavContext>
  );
}

export function useNav() {
  return useContext(NavContext);
}
