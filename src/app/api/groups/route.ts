import { randomUUID } from "crypto";
import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).max(120),
  subject: z.string().max(80).optional(),
  description: z.string().max(1000).optional()
});

export async function GET() {
  try {
    const user = await requireUser();
    const groups = await db.studyGroup.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        members: { include: { user: { select: { name: true } } } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { name: true } } }
        }
      }
    });
    return json({ groups });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    const group = await db.studyGroup.create({
      data: {
        ...body,
        createdById: user.id,
        inviteCode: randomUUID(),
        members: {
          create: {
            userId: user.id,
            role: "OWNER"
          }
        }
      }
    });
    return json({ group }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
