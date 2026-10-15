"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { accountUser, authClient } from "@/lib/auth-client";
import { linkedProvidersQuery, updateDisplayName } from "@/lib/me/account-client";
import { writeLocalePreference } from "@/lib/me/locale-preference";
import { patchUserSettings, userSettingsQuery } from "@/lib/me/settings-client";
import type { UserSettings, UserSettingsPatch } from "@/lib/me/settings-schema";
import type { Mount } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ACTION_OUTLINE_CLS,
  ACTION_PRIMARY_CLS,
  CHIP_ACTIVE_CLS,
  CHIP_BASE_CLS,
  CHIP_IDLE_CLS,
  ICON_NAV_BTN_CLS,
} from "@/config/ui-tokens";
import { useTestHookEnabled } from "@/context/TestHookProvider";
import { useMountPreference } from "@/context/MountPreferenceProvider";
import { useNav } from "@/context/NavProvider";
import NotFound from "@/app/[locale]/not-found";
import AuthDialog from "@/components/auth/AuthDialog";
import Avatar from "@/components/auth/Avatar";
import DeleteAccountDialog from "@/components/auth/DeleteAccountDialog";
import { SegmentedControl } from "@/components/ui/segmented-control";

const SECTIONS = ["settings", "account"] as const;
type SectionId = (typeof SECTIONS)[number];

const SECTION_TITLE_KEY = {
  settings: "settingsTitle",
  account: "accountTitle",
} as const satisfies Record<SectionId, string>;

const SECTION_CLS = "flex scroll-mt-[calc(var(--nav-height)+72px)] flex-col gap-4 md:scroll-mt-[calc(var(--nav-height)+24px)] md:gap-5";
const SECTION_TITLE_CLS = "font-heading text-xl font-bold text-zinc-900 dark:text-zinc-100";
const SECTION_SUB_CLS = "mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400 md:mt-1";

function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>(SECTIONS[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActive(visible.target.id as SectionId);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const id of SECTIONS) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, []);
  return active;
}

export default function ProfilePage() {
  const testHookEnabled = useTestHookEnabled();
  const { data: session, isPending } = authClient.useSession();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated || isPending) {
    return <div className="min-h-[60svh]" aria-busy="true" />;
  }
  if (!testHookEnabled) {
    return <NotFound />;
  }
  const user = accountUser(session);
  if (!user) {
    return <SignInPrompt />;
  }
  return <Profile user={user} />;
}

function SignInPrompt() {
  const t = useTranslations("Profile");
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-5 py-24 text-center">
      <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t("signInTitle")}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("signInBody")}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(ACTION_PRIMARY_CLS, "mt-3 h-10 rounded-lg px-5 text-sm font-medium")}
      >
        {t("signIn")}
      </button>
      <AuthDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

function Profile({ user }: { user: ProfileUser }) {
  const t = useTranslations("Profile");
  const active = useActiveSection();
  const { navHidden } = useNav();

  return (
    <div className="mx-auto flex w-full max-w-[1040px] gap-12 px-5 pt-6 pb-12 md:px-6 md:pt-10 md:pb-16">
      <nav
        aria-label={t("sectionsLabel")}
        className="sticky top-[calc(var(--nav-height)+40px)] mt-[104px] hidden w-[168px] shrink-0 flex-col gap-0.5 self-start md:flex"
      >
        {SECTIONS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? "true" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition-colors",
              active === id
                ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
            )}
          >
            {t(SECTION_TITLE_KEY[id])}
          </a>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-10 md:gap-12">
        <ProfileHeader user={user} />

        <nav
          aria-label={t("sectionsLabel")}
          className="sticky z-20 -mx-5 -mt-4 flex gap-2 overflow-x-auto border-b border-zinc-100 bg-white/90 px-5 py-2.5 backdrop-blur-sm transition-[top] duration-300 ease-in-out md:hidden dark:border-zinc-800 dark:bg-zinc-950/90"
          style={{ top: navHidden ? 0 : "var(--nav-height)" }}
        >
          {SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "true" : undefined}
              className={cn(CHIP_BASE_CLS, "h-[34px] px-3.5 text-[13px]", active === id ? CHIP_ACTIVE_CLS : CHIP_IDLE_CLS)}
            >
              {t(SECTION_TITLE_KEY[id])}
            </a>
          ))}
        </nav>

        <SettingsSection userId={user.id} />
        <AccountSection email={user.email} />
      </div>
    </div>
  );
}

function ProfileHeader({ user }: { user: ProfileUser }) {
  const t = useTranslations("Profile");
  const { data: providers } = useQuery(linkedProvidersQuery(user.id));
  const [editing, setEditing] = useState(false);
  const signedInWith = providers?.includes("google") ? t("signedInWithGoogle") : t("signedInWithEmail");

  return (
    <section className="flex items-center gap-3.5 md:gap-5">
      <Avatar
        name={user.name}
        email={user.email}
        image={user.image}
        className="h-14 w-14 text-[22px] md:h-16 md:w-16 md:text-2xl"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {editing ? (
          <NameForm initialName={user.name} onDone={() => setEditing(false)} />
        ) : (
          <div className="flex items-center gap-1 md:gap-1.5">
            <h1
              className={cn(
                "truncate font-heading text-2xl font-bold md:text-[28px] md:leading-9",
                user.name ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500",
              )}
            >
              {user.name || t("nameUnset")}
            </h1>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t("editName")}
              className={cn(ICON_NAV_BTN_CLS, "h-11 w-11 md:h-[30px] md:w-[30px]")}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}
        <p className="truncate text-[13px] text-zinc-500 md:text-sm dark:text-zinc-400">
          {user.email}
          {providers && ` · ${signedInWith}`}
        </p>
      </div>
    </section>
  );
}

function NameForm({ initialName, onDone }: { initialName: string; onDone: () => void }) {
  const t = useTranslations("Profile");
  const [name, setName] = useState(initialName);
  const save = useMutation({
    mutationFn: updateDisplayName,
    onSuccess: onDone,
    onError: () => toast.error(t("saveError")),
  });
  const trimmed = name.trim();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed === initialName) {
      onDone();
      return;
    }
    save.mutate(trimmed);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onDone();
          }
        }}
        aria-label={t("nameLabel")}
        placeholder={t("namePlaceholder")}
        maxLength={60}
        autoFocus
        className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-500 md:max-w-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <button
        type="submit"
        disabled={!trimmed || save.isPending}
        className={cn(ACTION_PRIMARY_CLS, "h-10 rounded-lg px-4 text-sm font-medium")}
      >
        {save.isPending ? t("saving") : t("save")}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="h-10 rounded-lg px-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        {t("cancel")}
      </button>
    </form>
  );
}

function SectionHeading({ id, subtitle }: { id: SectionId; subtitle?: string }) {
  const t = useTranslations("Profile");
  return (
    <div>
      <h2 className={SECTION_TITLE_CLS}>{t(SECTION_TITLE_KEY[id])}</h2>
      {subtitle && <p className={SECTION_SUB_CLS}>{subtitle}</p>}
    </div>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-6 md:border-b md:border-zinc-100 md:px-5 md:py-4 md:last:border-b-0 dark:md:border-zinc-800">
      <div>
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        <div className="hidden text-xs text-zinc-500 md:block dark:text-zinc-400">{hint}</div>
      </div>
      {children}
    </div>
  );
}

function SettingsSection({ userId }: { userId: string }) {
  const t = useTranslations("Profile");
  const m = useTranslations("MountSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { setPreference } = useMountPreference();
  const query = userSettingsQuery(userId);
  const { data: settings } = useQuery(query);

  const save = useMutation({
    mutationFn: patchUserSettings,
    onMutate: async (patch: UserSettingsPatch) => {
      await queryClient.cancelQueries({ queryKey: query.queryKey });
      const previous = queryClient.getQueryData<UserSettings>(query.queryKey);
      if (previous) {
        queryClient.setQueryData<UserSettings>(query.queryKey, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_error, patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(query.queryKey, context.previous);
        if (patch.defaultMount) {
          setPreference(context.previous.defaultMount);
        }
      }
      toast.error(t("saveError"));
    },
    onSuccess: (saved, patch) => {
      queryClient.setQueryData(query.queryKey, saved);
      if (patch.locale !== undefined) {
        writeLocalePreference(saved.locale);
        if (saved.locale && saved.locale !== locale) {
          router.replace(pathname, { locale: saved.locale });
        }
      }
    },
  });

  function changeMount(defaultMount: Mount) {
    setPreference(defaultMount);
    save.mutate({ defaultMount });
  }

  return (
    <section id="settings" className={SECTION_CLS}>
      <SectionHeading id="settings" subtitle={t("settingsSubtitle")} />
      <div className="flex flex-col gap-4 md:gap-0 md:rounded-2xl md:border md:border-zinc-200 dark:md:border-zinc-800">
        <SettingRow label={t("languageLabel")} hint={t("languageHint")}>
          <SegmentedControl
            label={t("languageLabel")}
            value={settings ? (settings.locale ?? locale) : undefined}
            options={[
              { value: "zh", label: "中文" },
              { value: "en", label: "English" },
            ]}
            onChange={(next) => save.mutate({ locale: next })}
            disabled={!settings}
            className="flex w-full md:inline-flex md:w-auto"
          />
        </SettingRow>
        <SettingRow label={t("mountLabel")} hint={t("mountHint")}>
          <SegmentedControl
            label={t("mountLabel")}
            value={settings?.defaultMount}
            options={[
              { value: "X", label: m("x") },
              { value: "G", label: m("gfx") },
            ]}
            onChange={changeMount}
            disabled={!settings}
            className="flex w-full md:inline-flex md:w-auto"
          />
        </SettingRow>
      </div>
    </section>
  );
}

function AccountSection({ email }: { email: string }) {
  const t = useTranslations("Profile");
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <section id="account" className={SECTION_CLS}>
      <SectionHeading id="account" />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-2xl md:border md:border-zinc-200 md:px-5 md:py-4 dark:md:border-zinc-800">
        <div>
          <div className="hidden text-sm font-medium text-zinc-900 md:block dark:text-zinc-100">{t("deleteLabel")}</div>
          <p className="text-[13px] leading-5 text-zinc-500 md:text-xs dark:text-zinc-400">{t("deleteHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className={cn(
            ACTION_OUTLINE_CLS,
            "h-11 shrink-0 justify-center text-red-600 md:h-9 dark:text-red-400",
          )}
        >
          {t("deleteLabel")}
        </button>
      </div>
      <DeleteAccountDialog email={email} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </section>
  );
}
