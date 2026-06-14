import { z } from "zod";
import { generateJson, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1).max(140),
  sourceText: z.string().max(40000).optional(),
  uploadId: z.string().optional(),
  question: z.string().max(4000).optional(),
  answer: z.string().max(4000).optional(),
  count: z.number().int().min(3).max(40).default(12)
});

export async function GET() {
  try {
    const user = await requireUser();
    const decks = await db.flashcardDeck.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        flashcards: {
          orderBy: { updatedAt: "desc" },
          include: {
            reviews: {
              where: { userId: user.id },
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });

    return json({ decks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, createSchema);
    const source =
      body.sourceText ??
      (body.uploadId
        ? (
            await db.upload.findFirstOrThrow({
              where: { id: body.uploadId, userId: user.id }
            })
          ).extractedText ?? ""
        : "");

    const deck = await db.flashcardDeck.create({
      data: {
        userId: user.id,
        title: body.title,
        sourceId: body.uploadId
      }
    });

    if (body.question && body.answer) {
      const card = await db.flashcard.create({
        data: {
          userId: user.id,
          deckId: deck.id,
          question: body.question,
          answer: body.answer
        }
      });
      return json({ deck, flashcards: [card] }, { status: 201 });
    }

    if (!source.trim()) {
      return json(
        { error: "Provide sourceText, uploadId, or a manual question and answer" },
        { status: 400 }
      );
    }

    await enforceRateLimit(user.id, "ai:flashcards", 25);
    const model = selectTextModel(user);
    const generated = await generateJson<{
      flashcards: Array<{ question: string; answer: string; tags?: string[] }>;
    }>({
      model,
      systemInstruction:
        "You create accurate study flashcards from the student's own material.",
      contents: `Create ${body.count} flashcards from this material:\n${source}`
    });

    const flashcards = await db.$transaction(
      generated.flashcards.map((card) =>
        db.flashcard.create({
          data: {
            userId: user.id,
            deckId: deck.id,
            question: card.question,
            answer: card.answer,
            tags: card.tags ?? []
          }
        })
      )
    );

    await db.aiUsage.create({
      data: {
        userId: user.id,
        feature: "flashcard_generator",
        model,
        input: source.length,
        output: JSON.stringify(generated).length
      }
    });

    return json({ deck, flashcards }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
