import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rebuildNoteEmbeddings } from "@/lib/rag";

const schema = z.object({
  title: z.string().min(1).max(180),
  content: z.string().max(120000),
  richContent: z.any().optional()
});

export async function GET() {
  try {
    const user = await requireUser();
    const notes = await db.note.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" }
    });
    return json({ notes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    const note = await db.note.create({
      data: {
        userId: user.id,
        title: body.title,
        content: body.content,
        richContent: body.richContent
      }
    });

    if (body.content.trim()) {
      await rebuildNoteEmbeddings({
        userId: user.id,
        noteId: note.id,
        content: body.content
      });
    }

    return json({ note }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
