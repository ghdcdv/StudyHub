import { MessageRole, Plan, AiMode } from "@prisma/client";
import { z } from "zod";
import { gemini, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const tutorSchema = z.object({
  message: z.string().min(1).max(8000),
  conversationId: z.string().optional(),
  subject: z.string().max(120).optional(),
  mode: z.nativeEnum(AiMode).default(AiMode.STANDARD),
  uploadIds: z.array(z.string()).max(5).default([])
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await readJson(request, tutorSchema);
    const uploadIds = body.uploadIds ?? [];
    await enforceRateLimit(
      user.id,
      "ai:tutor",
      user.plan === Plan.FREE ? 20 : 120
    );

    const conversation = body.conversationId
      ? await db.conversation.findFirstOrThrow({
          where: { id: body.conversationId, userId: user.id }
        })
      : await db.conversation.create({
          data: {
            userId: user.id,
            subject: body.subject,
            mode: body.mode,
            title: body.message.slice(0, 80)
          }
        });

    await db.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        role: MessageRole.USER,
        content: body.message
      }
    });

    const [messages, uploads] = await Promise.all([
      db.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: 14
      }),
      (body.uploadIds?.length ?? 0) > 0
          ? db.upload.findMany({
              where: {
                userId: user.id,
                id: { in: body.uploadIds ?? [] }
              },
            select: {
              fileName: true,
              extractedText: true,
              analysis: true
            }
          })
        : []
    ]);

    const model = selectTextModel(user);
    const transcript = messages
      .reverse()
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n\n");
    const context = uploads
      .map(
        (upload) =>
          `File: ${upload.fileName}\nExtracted text:\n${upload.extractedText ?? ""}\nAnalysis:\n${JSON.stringify(upload.analysis ?? {})}`
      )
      .join("\n\n");
    const systemInstruction = [
      "You are StudyHub AI Tutor, a safe and rigorous tutor for students.",
      "Never fabricate saved user data. Use only the provided conversation and file context.",
      "Render math in Markdown/LaTeX. Explain step by step when solving.",
      `Mode: ${body.mode}. Subject: ${body.subject ?? conversation.subject ?? "general"}.`
    ].join("\n");
    const prompt = `${context ? `Uploaded context:\n${context}\n\n` : ""}Conversation memory:\n${transcript}\n\nRespond to the latest student message.`;

    const encoder = new TextEncoder();
    let assistantContent = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const aiStream = await gemini().models.generateContentStream({
            model,
            contents: prompt,
            config: { systemInstruction }
          });

          for await (const chunk of aiStream) {
            const text = chunk.text ?? "";
            if (!text) continue;
            assistantContent += text;
            controller.enqueue(encoder.encode(text));
          }

          await db.$transaction([
            db.message.create({
              data: {
                conversationId: conversation.id,
                userId: user.id,
                role: MessageRole.ASSISTANT,
                content: assistantContent,
                metadata: { model }
              }
            }),
            db.conversation.update({
              where: { id: conversation.id },
              data: {
                subject: body.subject ?? conversation.subject,
                mode: body.mode
              }
            }),
            db.aiUsage.create({
              data: {
                userId: user.id,
                feature: "ai_tutor",
                model,
                input: prompt.length,
                output: assistantContent.length
              }
            })
          ]);

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Conversation-Id": conversation.id
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
