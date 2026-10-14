import { toNextJsHandler } from "better-auth/next-js";
import { createAuth } from "@/lib/auth";

const handler = async (request: Request) => createAuth().handler(request);

/** Better Auth: sign-in, email codes, session, sign-out, account deletion. See https://www.better-auth.com/docs/concepts/api */
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(handler);
