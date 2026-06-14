import { QuestionType } from "@prisma/client";
import { z } from "zod";
import { generateJson, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  title: z.string().min(1).max(140),
  subject: z.string().max(120).optional(),
  difficulty: z.string().max(40).optional(),
  sourceText: z.string().min(20).max(50000),
  count: z.number().int().min(3).max(40).default(10)
});

export async function GET() {
  try {
    const user = await requireUser();
    const quizzes = await db.quiz.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        questions: { orderBy: { order: "asc" } },
        attempts: { orderBy: { createdAt: "desc" }, take: 3 }
      }
    });

    return json({ quizzes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, createSchema);
    await enforceRateLimit(user.id, "ai:quiz", 25);

    const model = selectTextModel(user);
    const generated = await generateJson<{
      questions: Array<{
        type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
        prompt: string;
        options?: string[];
        correctAnswer: string;
        explanation?: string;
      }>;
    }>({
      model,
      systemInstruction:
        "You generate fair quizzes from student study material. Questions must be answerable from the source.",
      contents: `Create ${body.count} ${body.difficulty ?? ""} questions for ${body.subject ?? "the source material"}.\nSource:\n${body.sourceText}`
    });

    const quiz = await db.quiz.create({
      data: {
        userId: user.id,
        title: body.title,
        subject: body.subject,
        difficulty: body.difficulty,
        questions: {
          create: generated.questions.map((question, index) => ({
            type: question.type as QuestionType,
            prompt: question.prompt,
            options: question.options ?? null,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            order: index
          }))
        }
      },
      include: {
        questions: { orderBy: { order: "asc" } }
      }
    });

    await db.aiUsage.create({
      data: {
        userId: user.id,
        feature: "quiz_generator",
        model,
        input: body.sourceText.length,
        output: JSON.stringify(generated).length
      }
    });

    return json({ quiz }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
