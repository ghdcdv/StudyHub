import { AssignmentStatus } from "@prisma/client";
import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  title: z.string().min(1).max(160),
  subject: z.string().max(80).optional(),
  details: z.string().max(6000).optional(),
  dueAt: z.string().datetime()
});

export async function GET() {
  try {
    const user = await requireUser();
    const assignments = await db.assignment.findMany({
      where: { userId: user.id, status: { not: AssignmentStatus.ARCHIVED } },
      orderBy: { dueAt: "asc" }
    });
    return json({ assignments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    const assignment = await db.assignment.create({
      data: {
        userId: user.id,
        title: body.title,
        subject: body.subject,
        details: body.details,
        dueAt: new Date(body.dueAt)
      }
    });
    await db.notification.create({
      data: {
        userId: user.id,
        type: "ASSIGNMENT_DUE",
        title: `Assignment due: ${assignment.title}`,
        body: `Due ${assignment.dueAt.toLocaleString()}`
      }
    });
    return json({ assignment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
