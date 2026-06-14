import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardXp, XP } from "@/lib/xp";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  startAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(5).max(480).optional(),
  topic: z.string().max(160).optional(),
  completed: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);
    const item = await db.studyPlanItem.findFirstOrThrow({
      where: { id, plan: { userId: user.id } }
    });

    const updated = await db.studyPlanItem.update({
      where: { id },
      data: {
        startAt: body.startAt ? new Date(body.startAt) : undefined,
        durationMin: body.durationMin,
        topic: body.topic,
        completedAt:
          body.completed === true
            ? new Date()
            : body.completed === false
              ? null
              : undefined
      }
    });

    if (!item.completedAt && updated.completedAt) {
      await db.studySession.create({
        data: {
          userId: user.id,
          subject: updated.subject,
          durationMin: updated.durationMin
        }
      });
      await awardXp(user.id, XP.STUDY_SESSION);
    }

    return json({ item: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
