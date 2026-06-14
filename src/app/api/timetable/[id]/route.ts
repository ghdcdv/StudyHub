import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  subject: z.string().min(1).max(80).optional(),
  location: z.string().max(120).optional().nullable(),
  teacher: z.string().max(120).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startsAtMin: z.number().int().min(0).max(1439).optional(),
  durationMin: z.number().int().min(15).max(480).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional()
});

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);
    const result = await db.timetableClass.updateMany({
      where: { id, userId: user.id },
      data: body
    });
    if (!result.count) return json({ error: "Not found" }, { status: 404 });
    return json({
      class: await db.timetableClass.findUniqueOrThrow({ where: { id } })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const result = await db.timetableClass.deleteMany({
      where: { id, userId: user.id }
    });
    if (!result.count) return json({ error: "Not found" }, { status: 404 });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
