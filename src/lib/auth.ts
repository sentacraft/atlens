import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { anonymous, emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { D1Dialect } from "kysely-d1";
import { linkAnonymousUser } from "@/lib/askiris/link-anonymous-user";

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
        "atlens.app",
        "*.atlens.app",
        "*.sentacraft.com",
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
        async sendVerificationOTP({ email, otp }) {
          await env.EMAIL.send({
            from: env.AUTH_EMAIL_FROM,
            to: email,
            subject: "Your Atlens sign-in code",
            text: `Your Atlens sign-in code is ${otp}. It expires in five minutes.`,
            html: `<p>Your Atlens sign-in code is <strong>${otp}</strong>.</p><p>It expires in five minutes.</p>`,
          });
        },
      }),
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
