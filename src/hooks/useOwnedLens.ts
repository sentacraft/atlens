"use client";

import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountUser, authClient } from "@/lib/auth-client";
import { addGear, GearRequestError, removeGear, userGearQuery } from "@/lib/me/gear-client";
import { useTestHookEnabled } from "@/context/TestHookProvider";
import { useSignInPrompt } from "@/context/SignInDialogProvider";

/** Whether a catalog lens is in the signed-in user's gear, and a toggle that asks guests to sign in. */
export function useOwnedLens(lensId: string) {
  const t = useTranslations("LensActions");
  const tProfile = useTranslations("Profile");
  const enabled = useTestHookEnabled();
  const { data: session } = authClient.useSession();
  const user = accountUser(session);
  const promptSignIn = useSignInPrompt();
  const queryClient = useQueryClient();
  const query = userGearQuery(user?.id ?? "");
  const { data: gear = [] } = useQuery({ ...query, enabled: enabled && Boolean(user) });
  const item = gear.find((entry) => entry.kind === "lens" && entry.catalogId === lensId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (item) {
        await removeGear(item.id);
      } else {
        await addGear({ kind: "lens", catalogId: lensId });
      }
    },
    onError: (error) =>
      toast.error(
        error instanceof GearRequestError && error.code === "gear_limit_reached" ? tProfile("gearLimit") : tProfile("saveError"),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: query.queryKey }),
  });

  function toggle() {
    if (!user) {
      promptSignIn(t("ownSignIn"));
      return;
    }
    mutation.mutate();
  }

  return { enabled, owned: Boolean(item), pending: mutation.isPending, toggle };
}
