import { generateJson, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(user.id, "ai:revision", 20);
    const [attempts, reviews, sessions] = await Promise.all([
      db.quizAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { quiz: true, answers: { include: { question: true } } }
      }),
      db.flashcardReview.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { flashcard: true }
      }),
      db.studySession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30
      })
    ]);

    const model = selectTextModel(user);
    const plan = await generateJson<Record<string, unknown>>({
      model,
      systemInstruction:
        "Analyze real student performance data and produce weak areas, strong areas, and a practical revision plan.",
      contents: JSON.stringify({ attempts, reviews, sessions })
    });

    await db.aiUsage.create({
      data: {
        userId: user.id,
        feature: "revision_planner",
        model,
        input: JSON.stringify({ attempts, reviews, sessions }).length,
        output: JSON.stringify(plan).length
      }
    });

    return json({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
