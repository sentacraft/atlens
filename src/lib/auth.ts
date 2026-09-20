import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { D1Dialect } from "kysely-d1";

type AuthEnv = Cloudflare.Env & {
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

function getAuthContext() {
  const context = getCloudflareContext();
  const env = context.env as AuthEnv;

  if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is not configured");
  }

  return { context, env };
}

export function createAuth() {
  const { context, env } = getAuthContext();
  const socialProviders =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined;

  return betterAuth({
    appName: "Atlens",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: {
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "atlens.app",
        "*.atlens.app",
        "*.sentacraft.com",
      ],
      fallback: env.SITE_URL,
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
    plugins: [
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
