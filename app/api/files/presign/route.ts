import { randomUUID } from "crypto";
import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { signedUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";

const schema = z.object({
  fileName: z.string().min(1).max(160),
  contentType: z.string().min(1).max(120)
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    const key = `uploads/${user.id}/${randomUUID()}-${body.fileName.replace(/[^a-z0-9_.-]/gi, "_")}`;
    const url = await signedUploadUrl({
      key,
      contentType: body.contentType
    });

    return json({ key, url });
  } catch (error) {
    return handleApiError(error);
  }
}
