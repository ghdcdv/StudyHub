import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rebuildNoteEmbeddings } from "@/lib/rag";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().min(1).max(180).optional(),
  content: z.string().max(120000).optional(),
  richContent: z.any().optional()
});

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);

    await db.note.findFirstOrThrow({ where: { id, userId: user.id } });
    const note = await db.note.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        richContent: body.richContent
      }
    });

    if (body.content !== undefined) {
      await rebuildNoteEmbeddings({
        userId: user.id,
        noteId: id,
        content: body.content
      });
    }

    return json({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const result = await db.note.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) return json({ error: "Not found" }, { status: 404 });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
