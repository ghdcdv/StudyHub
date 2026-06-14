import { z } from "zod";
import { generateJson, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  title: z.string().min(1).max(140),
  examDate: z.string().datetime(),
  subjects: z.array(
    z.object({
      subject: z.string().min(1).max(80),
      confidence: z.number().int().min(1).max(5),
      weeklyHours: z.number().min(0.5).max(40)
    })
  )
});

export async function GET() {
  try {
    const user = await requireUser();
    const plans = await db.studyPlan.findMany({
      where: { userId: user.id },
      orderBy: { examDate: "asc" },
      include: { items: { orderBy: { startAt: "asc" } } }
    });
    return json({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    await enforceRateLimit(user.id, "ai:planner", 20);

    const model = selectTextModel(user);
    const generated = await generateJson<{
      items: Array<{
        subject: string;
        topic?: string;
        startAt: string;
        durationMin: number;
      }>;
    }>({
      model,
      systemInstruction:
        "You create realistic study schedules. Use ISO timestamps and respect the exam date.",
      contents: `Exam date: ${body.examDate}\nSubjects:\n${JSON.stringify(body.subjects)}\nCreate a schedule from today until the exam.`
    });

    const plan = await db.studyPlan.create({
      data: {
        userId: user.id,
        title: body.title,
        examDate: new Date(body.examDate),
        inputs: body,
        items: {
          create: generated.items.map((item) => ({
            subject: item.subject,
            topic: item.topic,
            startAt: new Date(item.startAt),
            durationMin: item.durationMin
          }))
        }
      },
      include: { items: { orderBy: { startAt: "asc" } } }
    });

    await db.aiUsage.create({
      data: {
        userId: user.id,
        feature: "study_planner",
        model,
        input: JSON.stringify(body).length,
        output: JSON.stringify(generated).length
      }
    });

    return json({ plan }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
