import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { featurePillClass, filterPillActiveClass } from "./styles";

export type FeatureToggleOption<K extends string> = {
  key: K;
  label: string;
  icon: LucideIcon;
}

interface FeatureToggleGroupProps<K extends string> {
  options: FeatureToggleOption<K>[];
  selectedKeys: readonly K[];
  onToggle: (key: K) => void;
}

// Controlled group: selection state and the toggle handler live here, not on each
// option. Generic over the key type so the caller keeps its key union.
export default function FeatureToggleGroup<K extends string>({
  options,
  selectedKeys,
  onToggle,
}: FeatureToggleGroupProps<K>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = selectedKeys.includes(option.key);
        return (
          <Button
            key={option.key}
            size="sm"
            variant={selected ? "default" : "outline"}
            className={cn(
              selected ? filterPillActiveClass : featurePillClass,
              "whitespace-nowrap",
            )}
            onClick={() => onToggle(option.key)}
            aria-pressed={selected}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="relative inline-flex h-3.5 w-3.5 shrink-0">
                <Icon
                  className={cn(
                    "absolute inset-0 h-3.5 w-3.5 transition-all duration-200",
                    selected ? "scale-75 opacity-0" : "scale-100 opacity-100",
                  )}
                />
                <Check
                  className={cn(
                    "absolute inset-0 h-3.5 w-3.5 transition-all duration-200",
                    selected ? "scale-100 opacity-100" : "scale-75 opacity-0",
                  )}
                />
              </span>
              {option.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
