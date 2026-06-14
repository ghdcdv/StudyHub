import { Plan } from "@prisma/client";
import { randomUUID } from "crypto";
import { generateJson, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractDocumentWithGemini } from "@/lib/file-text";
import { enforceRateLimit } from "@/lib/rate-limit";
import { publicUrlForKey, putObject } from "@/lib/storage";

export const runtime = "nodejs";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(
      user.id,
      "homework:scan",
      user.plan === Plan.FREE ? 5 : 40
    );

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ error: "Missing file" }, { status: 400 });
    }

    if (!allowedMimeTypes.has(file.type)) {
      return json({ error: "Unsupported file type" }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `uploads/${user.id}/${randomUUID()}-${safeName(file.name)}`;
    const model = selectTextModel(user);

    await putObject({
      key,
      body: buffer,
      contentType: file.type
    });

    const upload = await db.upload.create({
      data: {
        userId: user.id,
        fileName: file.name,
        mimeType: file.type,
        byteSize: buffer.byteLength,
        storageKey: key,
        publicUrl: publicUrlForKey(key),
        status: "PROCESSING"
      }
    });

    try {
      const extracted = await extractDocumentWithGemini({
        model,
        mimeType: file.type,
        base64: buffer.toString("base64")
      });

      const solution = await generateJson<{
        questions: Array<{
          question: string;
          answer: string;
          steps: string[];
          similarPractice: string[];
        }>;
      }>({
        model,
        systemInstruction:
          "You solve homework from extracted student worksheets. Be accurate and educational.",
        contents: `Extracted worksheet text:\n${extracted.text}\n\nReturn JSON with a questions array. Each item must include question, answer, steps, and similarPractice.`
      });

      const completed = await db.upload.update({
        where: { id: upload.id },
        data: {
          extractedText: extracted.text,
          analysis: {
            headings: extracted.headings,
            keyConcepts: extracted.keyConcepts,
            summary: extracted.summary,
            solution
          },
          status: "COMPLETED"
        }
      });

      await db.aiUsage.create({
        data: {
          userId: user.id,
          feature: "homework_scanner",
          model,
          input: buffer.byteLength,
          output: JSON.stringify(solution).length
        }
      });

      return json({ upload: completed, extracted, solution });
    } catch (error) {
      await db.upload.update({
        where: { id: upload.id },
        data: {
          status: "FAILED",
          analysis: {
            error: error instanceof Error ? error.message : "Unknown error"
          }
        }
      });
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

function safeName(name: string): string {
  return name.replace(/[^a-z0-9_.-]/gi, "_").slice(0, 120);
}
