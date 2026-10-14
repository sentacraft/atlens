import "server-only";

import { NextResponse } from "next/server";

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function invalidRequest(): NextResponse {
  return NextResponse.json({ error: "invalid_request" }, { status: 400 });
}

/** The parsed JSON body, or undefined when the body is not JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return undefined;
  }
}
