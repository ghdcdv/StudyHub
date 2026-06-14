import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  content: z.string().min(1).max(5000)
});

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await db.groupMembership.findUniqueOrThrow({
      where: { userId_groupId: { userId: user.id, groupId: id } }
    });
    const messages = await db.groupMessage.findMany({
      where: { groupId: id },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { user: { select: { name: true } } }
    });
    return json({ messages });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request, schema);
    await db.groupMembership.findUniqueOrThrow({
      where: { userId_groupId: { userId: user.id, groupId: id } }
    });
    const message = await db.groupMessage.create({
      data: {
        userId: user.id,
        groupId: id,
        content: body.content
      },
      include: { user: { select: { name: true } } }
    });
    return json({ message }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
