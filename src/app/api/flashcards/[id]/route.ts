import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  question: z.string().min(1).max(4000).optional(),
  answer: z.string().min(1).max(4000).optional(),
  tags: z.array(z.string().max(60)).max(12).optional()
});

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, updateSchema);

    const result = await db.flashcard.updateMany({
      where: { id, userId: user.id },
      data: body
    });

    if (!result.count) return json({ error: "Not found" }, { status: 404 });

    const flashcard = await db.flashcard.findUniqueOrThrow({ where: { id } });
    return json({ flashcard });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;

    const result = await db.flashcard.deleteMany({
      where: { id, userId: user.id }
    });

    if (!result.count) return json({ error: "Not found" }, { status: 404 });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
