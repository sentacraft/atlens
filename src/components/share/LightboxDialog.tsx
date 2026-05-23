"use client";

import { motion } from "motion/react";
import { ChevronDown, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { LightboxState } from "@/hooks/useLightbox";

type LightboxDialogProps = Omit<LightboxState, "handleOpen" | "scrollRef"> & {
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

export function LightboxDialog({
  open,
  imageUrl,
  imageLoading,
  hasScrolled,
  isScrollable,
  scrollRef,
  handleClose,
  handleScroll,
  handleImageLoad,
}: LightboxDialogProps) {
  const t = useTranslations("Share");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
      responsive={false}
    >
      <DialogContent
        noDefaultPositioning
        className="fixed inset-0 flex items-center justify-center border-0 bg-transparent p-0 shadow-none duration-100"
        backdropClassName="bg-zinc-950/75 transition-[background-color] duration-150"
        showCloseButton={false}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div className="relative w-[calc(100vw-44px)] max-w-[750px]">
          <button
            onClick={handleClose}
            className="absolute right-0 top-0 z-10 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-zinc-500 shadow-md transition-colors hover:text-zinc-900 sm:hidden"
            aria-label={t("close")}
          >
            <X className="size-3.5" />
          </button>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="relative w-full overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.06)]"
          >
            <div
              ref={scrollRef}
              className="max-h-[calc(100svh-3rem-10px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[calc(100svh-3rem)]"
              onScroll={() => {
                if (!hasScrolled) {
                  handleScroll();
                }
              }}
            >
              {imageLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-zinc-400" />
                </div>
              ) : imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob URL, not optimizable
                <img src={imageUrl} alt="" className="w-full" onLoad={handleImageLoad} />
              ) : null}
            </div>

            {isScrollable && !hasScrolled && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-28 flex-col items-center justify-end bg-[linear-gradient(to_top,white_30%,rgba(255,255,255,0.85)_60%,transparent)] pb-4">
                <ChevronDown className="size-6 -mb-2 text-zinc-600" />
                <ChevronDown className="size-6 text-zinc-600" />
              </div>
            )}
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
