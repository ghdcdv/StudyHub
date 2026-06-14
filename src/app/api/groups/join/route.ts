import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  inviteCode: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    const group = await db.studyGroup.findUniqueOrThrow({
      where: { inviteCode: body.inviteCode }
    });
    const membership = await db.groupMembership.upsert({
      where: { userId_groupId: { userId: user.id, groupId: group.id } },
      create: { userId: user.id, groupId: group.id },
      update: {}
    });
    return json({ group, membership });
  } catch (error) {
    return handleApiError(error);
  }
}
