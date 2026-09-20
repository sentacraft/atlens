"use client";

import { useTranslations } from "next-intl";
import Iris from "@/components/iris/Iris";
import type { IrisConfig } from "@/config/iris-config";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

const IRIS_FEEDBACK: IrisConfig = {
  N: 7,
  pinDistance: 85,
  slotOffset: 0.804533,
  bladeLength: 120,
  bladeWidth: 40,
  openFStop: 1.4,
  defaultFStop: 4,
  size: 48,
  strokeWidth: 1,
  onMount: { type: "sweep", sweepMs: 600, totalMs: 1200 },
  chaseTauMs: 60,
};

export default function FeedbackSuccessState({
  onClose,
  uid = "feedback-iris",
}: {
  onClose: () => void;
  uid?: string;
}) {
  const t = useTranslations("Feedback");

  return (
    <>
      <div className="flex flex-col items-center gap-3 px-5 py-6">
        <Iris config={IRIS_FEEDBACK} uid={uid} />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {t("success")}
          </p>
          <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("successBody")}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("close")}
        </Button>
      </DialogFooter>
    </>
  );
}
