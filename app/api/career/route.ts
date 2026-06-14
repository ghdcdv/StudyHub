import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { generateJson, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  interests: z.array(z.string().min(1).max(80)).min(1).max(20),
  subjects: z.array(z.string().min(1).max(80)).max(20),
  skills: z.array(z.string().min(1).max(80)).max(30)
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    await enforceRateLimit(user.id, "ai:career", 10);
    const model = selectTextModel(user);
    const result = await generateJson<Prisma.InputJsonValue>({
      model,
      systemInstruction:
        "You are a student career coach. Recommend realistic careers, university paths, and learning roadmaps.",
      contents: JSON.stringify(body)
    });

    const profile = await db.careerProfile.create({
      data: {
        userId: user.id,
        interests: body.interests,
        subjects: body.subjects,
        skills: body.skills,
        result
      }
    });

    return json({ profile }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
