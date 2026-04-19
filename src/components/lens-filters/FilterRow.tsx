import type { ReactNode } from "react";
import { rowClass, rowLabelClass } from "./styles";

interface FilterRowProps {
  label: string;
  children: ReactNode;
}

export default function FilterRow({ label, children }: FilterRowProps) {
  return (
    <div className={rowClass}>
      <span className={rowLabelClass}>{label}</span>
      {children}
    </div>
  );
}
