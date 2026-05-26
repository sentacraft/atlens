import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { miniLabelClass, rowClass, rowLabelClass } from "./styles";

interface FilterRowProps {
  label: string;
  children: ReactNode;
  labelOn?: "always" | "desktop";
}

export default function FilterRow({ label, children, labelOn = "always" }: FilterRowProps) {
  if (labelOn === "desktop") {
    return (
      <div className={rowClass}>
        <span className={cn(rowLabelClass, "hidden sm:flex")}>{label}</span>
        {children}
      </div>
    );
  }

  return (
    <div className={rowClass}>
      <span className={cn(miniLabelClass, "sm:hidden")}>{label}</span>
      <span className={cn(rowLabelClass, "hidden sm:flex")}>{label}</span>
      {children}
    </div>
  );
}
