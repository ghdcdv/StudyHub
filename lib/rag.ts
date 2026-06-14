import "server-only";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { embedText } from "@/lib/ai";

export function chunkText(text: string, maxLength = 1200): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];

  for (let index = 0; index < normalized.length; index += maxLength) {
    chunks.push(normalized.slice(index, index + maxLength));
  }

  return chunks.filter(Boolean);
}

export async function rebuildNoteEmbeddings({
  userId,
  noteId,
  content
}: {
  userId: string;
  noteId: string;
  content: string;
}): Promise<void> {
  await db.noteChunk.deleteMany({ where: { noteId, userId } });
  const chunks = chunkText(content);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk);
    await db.$executeRawUnsafe(
      `INSERT INTO "NoteChunk" ("id", "userId", "noteId", "content", "embedding", "createdAt")
       VALUES ($1, $2, $3, $4, $5::vector, NOW())`,
      randomUUID(),
      userId,
      noteId,
      chunk,
      vectorLiteral(embedding)
    );
  }
}

export async function searchNoteChunks({
  userId,
  query,
  limit = 6
}: {
  userId: string;
  query: string;
  limit?: number;
}): Promise<Array<{ noteId: string; title: string; content: string; score: number }>> {
  const embedding = await embedText(query);

  return db.$queryRawUnsafe<
    Array<{ noteId: string; title: string; content: string; score: number }>
  >(
    `SELECT nc."noteId", n."title", nc."content",
            1 - (nc."embedding" <=> $1::vector) AS score
       FROM "NoteChunk" nc
       JOIN "Note" n ON n."id" = nc."noteId"
      WHERE nc."userId" = $2
      ORDER BY nc."embedding" <=> $1::vector
      LIMIT $3`,
    vectorLiteral(embedding),
    userId,
    limit
  );
}

function vectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}
