import { QuestionType } from "@prisma/client";
import { z } from "zod";
import { generateJson, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardXp, XP } from "@/lib/xp";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      answer: z.string().max(4000)
    })
  )
});

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);
    const quiz = await db.quiz.findFirstOrThrow({
      where: { id, userId: user.id },
      include: { questions: true }
    });

    const answerMap = new Map(
      body.answers.map((answer) => [answer.questionId, answer.answer])
    );
    const graded = [];

    for (const question of quiz.questions) {
      const answer = answerMap.get(question.id) ?? "";
      let isCorrect =
        normalize(answer) === normalize(question.correctAnswer) ||
        (question.type === QuestionType.MCQ &&
          normalize(answer).includes(normalize(question.correctAnswer)));

      if (question.type === QuestionType.SHORT_ANSWER && answer.trim()) {
        const model = selectTextModel(user);
        const result = await generateJson<{ correct: boolean }>({
          model,
          systemInstruction:
            "Grade the student's short answer. Return JSON with only a boolean field named correct.",
          contents: `Question: ${question.prompt}\nExpected answer: ${question.correctAnswer}\nStudent answer: ${answer}`
        });
        isCorrect = result.correct;
      }

      graded.push({ question, answer, isCorrect });
    }

    const score = graded.filter((item) => item.isCorrect).length;
    const total = quiz.questions.length;
    const attempt = await db.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: quiz.id,
        score,
        total,
        accuracy: total ? score / total : 0,
        answers: {
          create: graded.map((item) => ({
            questionId: item.question.id,
            answer: item.answer,
            isCorrect: item.isCorrect
          }))
        }
      },
      include: { answers: true }
    });

    await awardXp(user.id, XP.QUIZ_COMPLETED);
    return json({ attempt });
  } catch (error) {
    return handleApiError(error);
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}
