import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  gradeLevel: z.string().max(80).optional(),
  school: z.string().max(160).optional(),
  country: z.string().max(80).optional(),
  subjects: z.array(z.string().min(1).max(80)).max(30).optional()
});

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    const updated = await db.user.update({
      where: { id: user.id },
      data: body
    });
    return json({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
