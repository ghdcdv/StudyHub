import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { UnauthorizedError } from "@/lib/auth";

export function json<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export async function readJson<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return json(
      {
        error: "Invalid request",
        details: error.flatten()
      },
      { status: 422 }
    );
  }

  if (error instanceof UnauthorizedError) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  if (error instanceof Error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ error: "Unknown server error" }, { status: 500 });
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const requestUrl = new URL(request.url);
  if (origin !== `${requestUrl.protocol}//${requestUrl.host}`) {
    throw new Error("Cross-origin mutation blocked");
  }
}
