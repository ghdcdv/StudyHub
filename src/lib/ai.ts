import "server-only";

import { GoogleGenAI } from "@google/genai";
import { Plan, type User } from "@prisma/client";
import { requiredEnv, optionalEnv } from "@/lib/env";

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({
      apiKey: requiredEnv("GEMINI_API_KEY")
    });
  }

  return client;
}

export function selectTextModel(user: Pick<User, "plan">): string {
  if (user.plan === Plan.PREMIUM || user.plan === Plan.TEAM) {
    return optionalEnv("GEMINI_PRO_MODEL", "gemini-2.5-pro");
  }

  return optionalEnv("GEMINI_FLASH_MODEL", "gemini-2.5-flash");
}

export function embeddingModel(): string {
  return optionalEnv("GEMINI_EMBEDDING_MODEL", "text-embedding-004");
}

export async function generateText({
  model,
  contents,
  systemInstruction
}: {
  model: string;
  contents: string;
  systemInstruction?: string;
}): Promise<string> {
  const response = await gemini().models.generateContent({
    model,
    contents,
    config: systemInstruction ? { systemInstruction } : undefined
  });

  return response.text ?? "";
}

export async function generateJson<T>({
  model,
  contents,
  systemInstruction
}: {
  model: string;
  contents: string;
  systemInstruction: string;
}): Promise<T> {
  const text = await generateText({
    model,
    contents,
    systemInstruction: `${systemInstruction}\nReturn only valid JSON. Do not wrap the response in markdown.`
  });

  return JSON.parse(stripCodeFence(text)) as T;
}

export async function embedText(text: string): Promise<number[]> {
  const response = await gemini().models.embedContent({
    model: embeddingModel(),
    contents: text
  });

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) {
    throw new Error("Gemini did not return an embedding");
  }

  return values;
}

export function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}
