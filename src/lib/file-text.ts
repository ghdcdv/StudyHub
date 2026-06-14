import "server-only";

import { gemini, stripCodeFence } from "@/lib/ai";

export type ExtractedDocument = {
  text: string;
  headings: string[];
  keyConcepts: string[];
  summary: string;
};

export async function extractDocumentWithGemini({
  model,
  mimeType,
  base64
}: {
  model: string;
  mimeType: string;
  base64: string;
}): Promise<ExtractedDocument> {
  const response = await gemini().models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "Read this uploaded student file. Return only JSON with text, headings, keyConcepts, and summary. Preserve equations and question numbering."
          },
          {
            inlineData: {
              mimeType,
              data: base64
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(stripCodeFence(response.text ?? "")) as ExtractedDocument;
}
