import { createHmac } from "crypto";
import { handleApiError, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requiredEnv } from "@/lib/env";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await db.groupMembership.findUniqueOrThrow({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: id
        }
      }
    });

    const payload = Buffer.from(
      JSON.stringify({
        userId: user.id,
        groupId: id,
        exp: Date.now() + 1000 * 60 * 10
      })
    ).toString("base64url");
    const signature = createHmac("sha256", requiredEnv("REALTIME_SECRET"))
      .update(payload)
      .digest("base64url");

    return json({ token: `${payload}.${signature}` });
  } catch (error) {
    return handleApiError(error);
  }
}
