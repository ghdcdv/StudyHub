import { addDays } from "date-fns";
import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardXp, XP } from "@/lib/xp";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  confidence: z.number().int().min(1).max(5)
});

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);

    await db.flashcard.findFirstOrThrow({
      where: { id, userId: user.id }
    });

    const review = await db.flashcardReview.create({
      data: {
        userId: user.id,
        flashcardId: id,
        confidence: body.confidence,
        nextReview: addDays(new Date(), body.confidence)
      }
    });

    await awardXp(user.id, XP.FLASHCARD_REVIEWED);
    return json({ review });
  } catch (error) {
    return handleApiError(error);
  }
}
