import { z } from "zod";
import { assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  subject: z.string().min(1).max(80),
  location: z.string().max(120).optional(),
  teacher: z.string().max(120).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startsAtMin: z.number().int().min(0).max(1439),
  durationMin: z.number().int().min(15).max(480),
  color: z.string().regex(/^#[0-9a-f]{6}$/i)
});

export async function GET() {
  try {
    const user = await requireUser();
    const classes = await db.timetableClass.findMany({
      where: { userId: user.id },
      orderBy: [{ dayOfWeek: "asc" }, { startsAtMin: "asc" }]
    });
    return json({ classes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, schema);
    const timetableClass = await db.timetableClass.create({
      data: { ...body, userId: user.id }
    });
    return json({ class: timetableClass }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
