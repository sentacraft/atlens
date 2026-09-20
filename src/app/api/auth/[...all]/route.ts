import { toNextJsHandler } from "better-auth/next-js";
import { createAuth } from "@/lib/auth";

const handler = async (request: Request) => createAuth().handler(request);

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(handler);
