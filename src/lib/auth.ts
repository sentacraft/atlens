import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { anonymous, emailOTP, oAuthProxy } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { D1Dialect } from "kysely-d1";
import { cookieReader } from "@/lib/analytics/session";
import { recordSignIn } from "@/lib/analytics/sign-in-event";
import { linkAnonymousUser } from "@/lib/askiris/link-anonymous-user";
import { deleteAccountEmail, signInCodeEmail } from "@/lib/auth-email";
import { emailLocale } from "@/lib/locale-preference";
import { getSavedLocaleByEmail, getUserSettings } from "@/lib/me/settings-repository";
import { SITE } from "@/config/site";

function getAuthContext() {
  const context = getCloudflareContext();
  const env = context.env;
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not configured");
  }

  return { context, env, secret };
}

export function createAuth() {
  const { context, env, secret } = getAuthContext();
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const siteURL = process.env.SITE_URL;
  const socialProviders =
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined;

  return betterAuth({
    appName: "Atlens",
    secret,
    baseURL: {
      allowedHosts: [
        // Patterns are compared against the Host header, which carries the port.
        "localhost",
        "localhost:*",
        "127.0.0.1",
        "127.0.0.1:*",
        SITE.host,
        `*.${SITE.host}`,
      ],
      fallback: siteURL,
    },
    database: {
      dialect: new D1Dialect({ database: env.APP_DB }),
      type: "sqlite",
      transaction: false,
    },
    socialProviders,
    user: {
      deleteUser: {
        enabled: true,
        // Without a confirmation email, deletion needs a session under a day old: these
        // accounts have no password to re-check instead.
        async sendDeleteAccountVerification({ user, url }, request) {
          const { locale } = await getUserSettings(env.APP_DB, user.id);
          await env.EMAIL.send({
            from: env.AUTH_EMAIL_FROM,
            to: user.email,
            ...deleteAccountEmail(emailLocale(locale, request?.headers), url),
          });
        },
      },
    },
    databaseHooks: {
      session: {
        create: {
          async after(session, ctx) {
            if (!ctx) {
              return;
            }
            const user = await ctx.context.internalAdapter.findUserById(session.userId);
            if (!user) {
              return;
            }
            const write = recordSignIn(
              env.ANALYTICS_DB,
              { path: ctx.path, user, sessionCreatedAt: session.createdAt },
              { cookies: cookieReader(ctx.headers?.get("cookie")), raw: ctx.request },
            ).catch((error: unknown) => console.error("[auth] failed to record sign-in", error));
            context.ctx.waitUntil(write);
          },
        },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/get-session": false,
      },
    },
    plugins: [
      anonymous({
        // The plugin would delete the anonymous user even when moving its conversations
        // failed, and the delete cascades to them; linkAnonymousUser deletes only on success.
        disableDeleteAnonymousUser: true,
        onLinkAccount: ({ anonymousUser, newUser, ctx }) =>
          linkAnonymousUser(env.APP_DB, {
            anonymousUserId: anonymousUser.user.id,
            newUserId: newUser.user.id,
            newUserIsAnonymous: Boolean(newUser.user.isAnonymous),
            deleteUser: (userId) => ctx.context.internalAdapter.deleteUser(userId),
          }),
      }),
      emailOTP({
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp }, ctx) {
          const locale = await getSavedLocaleByEmail(env.APP_DB, email);
          await env.EMAIL.send({
            from: env.AUTH_EMAIL_FROM,
            to: email,
            ...signInCodeEmail(emailLocale(locale, ctx?.headers), otp),
          });
        },
      }),
      // Google accepts only the production callback, so previews sign in through it; the
      // proxy secret is the one secret previews share with production.
      oAuthProxy({ productionURL: siteURL, secret: process.env.OAUTH_PROXY_SECRET }),
      nextCookies(),
    ],
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      database: {
        // D1 does not authorize the schema introspection queries Better Auth uses for validation.
        validateSchema: false,
      },
      backgroundTasks: {
        handler(promise) {
          context.ctx.waitUntil(promise);
        },
      },
    },
  });
}
