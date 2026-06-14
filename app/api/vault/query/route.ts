import { z } from "zod";
import { generateText, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { searchNoteChunks } from "@/lib/rag";

const schema = z.object({
  question: z.string().min(1).max(2000)
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    await enforceRateLimit(user.id, "ai:vault", 50);

    const chunks = await searchNoteChunks({
      userId: user.id,
      query: body.question
    });
    if (!chunks.length) {
      return json({
        answer: "I could not find relevant saved notes for that question.",
        sources: []
      });
    }

    const model = selectTextModel(user);
    const answer = await generateText({
      model,
      systemInstruction:
        "Answer only from the supplied student note excerpts. Cite note titles inline. If context is insufficient, say so.",
      contents: `Question: ${body.question}\n\nRelevant note excerpts:\n${chunks
        .map(
          (chunk, index) =>
            `[${index + 1}] ${chunk.title} (score ${chunk.score.toFixed(3)}):\n${chunk.content}`
        )
        .join("\n\n")}`
    });

    await db.aiUsage.create({
      data: {
        userId: user.id,
        feature: "knowledge_vault",
        model,
        input: body.question.length,
        output: answer.length
      }
    });

    return json({
      answer,
      sources: chunks.map((chunk) => ({
        noteId: chunk.noteId,
        title: chunk.title,
        score: chunk.score
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}
