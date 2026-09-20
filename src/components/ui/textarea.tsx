import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
