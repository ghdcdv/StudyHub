import { randomUUID } from "crypto";
import { generateJson, selectTextModel } from "@/lib/ai";
import { assertSameOrigin, handleApiError, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractDocumentWithGemini } from "@/lib/file-text";
import { rebuildNoteEmbeddings } from "@/lib/rag";
import { publicUrlForKey, putObject } from "@/lib/storage";

export const runtime = "nodejs";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    const generateStudySet = form.get("generateStudySet") === "true";
    if (!(file instanceof File)) {
      return json({ error: "Missing file" }, { status: 400 });
    }
    if (!allowedMimeTypes.has(file.type)) {
      return json({ error: "Unsupported file type" }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `notes/${user.id}/${randomUUID()}-${file.name.replace(/[^a-z0-9_.-]/gi, "_")}`;
    await putObject({ key, body: buffer, contentType: file.type });

    const model = selectTextModel(user);
    const extracted =
      file.type === "text/plain"
        ? {
            text: buffer.toString("utf8"),
            headings: [],
            keyConcepts: [],
            summary: ""
          }
        : await extractDocumentWithGemini({
            model,
            mimeType: file.type,
            base64: buffer.toString("base64")
          });

    const upload = await db.upload.create({
      data: {
        userId: user.id,
        fileName: file.name,
        mimeType: file.type,
        byteSize: buffer.byteLength,
        storageKey: key,
        publicUrl: publicUrlForKey(key),
        status: "COMPLETED",
        extractedText: extracted.text,
        analysis: extracted
      }
    });

    const note = await db.note.create({
      data: {
        userId: user.id,
        uploadId: upload.id,
        title: file.name.replace(/\.[^.]+$/, ""),
        content: extracted.text,
        richContent: {
          headings: extracted.headings,
          keyConcepts: extracted.keyConcepts,
          summary: extracted.summary
        }
      }
    });

    await rebuildNoteEmbeddings({
      userId: user.id,
      noteId: note.id,
      content: extracted.text
    });

    let studySet = null;
    if (generateStudySet && extracted.text.trim()) {
      const generated = await generateJson<{
        flashcards: Array<{ question: string; answer: string }>;
        quiz: Array<{
          type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
          prompt: string;
          options?: string[];
          correctAnswer: string;
          explanation?: string;
        }>;
      }>({
        model,
        systemInstruction:
          "You turn uploaded notes into accurate flashcards and quiz questions.",
        contents: `Create flashcards and a quiz from this material:\n${extracted.text}`
      });

      const deck = await db.flashcardDeck.create({
        data: {
          userId: user.id,
          title: `${note.title} flashcards`,
          sourceId: upload.id,
          flashcards: {
            create: generated.flashcards.map((card) => ({
              userId: user.id,
              question: card.question,
              answer: card.answer
            }))
          }
        }
      });
      const quiz = await db.quiz.create({
        data: {
          userId: user.id,
          title: `${note.title} quiz`,
          sourceId: upload.id,
          questions: {
            create: generated.quiz.map((question, order) => ({
              type: question.type,
              prompt: question.prompt,
              options: question.options ?? null,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              order
            }))
          }
        }
      });
      studySet = { deck, quiz };
    }

    return json({ upload, note, extracted, studySet }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
