import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

/** The sign-in providers linked to the account, e.g. "google". */
export function linkedProvidersQuery(userId: string) {
  return queryOptions({
    queryKey: ["me", "providers", userId],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) {
        throw new Error("list_accounts_failed");
      }
      return data.map((account) => account.providerId);
    },
    staleTime: Infinity,
  });
}

export async function updateDisplayName(name: string): Promise<void> {
  const { error } = await authClient.updateUser({ name });
  if (error) {
    throw new Error("update_name_failed");
  }
}
