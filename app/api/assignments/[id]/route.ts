import { AssignmentStatus } from "@prisma/client";
import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { awardXp, XP } from "@/lib/xp";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().min(1).max(160).optional(),
  subject: z.string().max(80).optional().nullable(),
  details: z.string().max(6000).optional().nullable(),
  dueAt: z.string().datetime().optional(),
  status: z.nativeEnum(AssignmentStatus).optional()
});

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);
    const before = await db.assignment.findFirstOrThrow({
      where: { id, userId: user.id }
    });
    const assignment = await db.assignment.update({
      where: { id },
      data: {
        title: body.title,
        subject: body.subject,
        details: body.details,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        status: body.status,
        completedAt:
          body.status === AssignmentStatus.COMPLETED
            ? new Date()
            : body.status === AssignmentStatus.OPEN
              ? null
              : undefined
      }
    });

    if (
      before.status !== AssignmentStatus.COMPLETED &&
      assignment.status === AssignmentStatus.COMPLETED
    ) {
      await awardXp(user.id, XP.ASSIGNMENT_COMPLETED);
    }

    if (body.dueAt && assignment.status === AssignmentStatus.OPEN) {
      await db.notification.create({
        data: {
          userId: user.id,
          type: "ASSIGNMENT_DUE",
          title: `Assignment due: ${assignment.title}`,
          body: `Due ${assignment.dueAt.toLocaleString()}`
        }
      });
    }

    return json({ assignment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const result = await db.assignment.deleteMany({
      where: { id, userId: user.id }
    });
    if (!result.count) return json({ error: "Not found" }, { status: 404 });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
