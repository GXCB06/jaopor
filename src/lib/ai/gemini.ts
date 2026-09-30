// Google Gemini (free tier via AI Studio key) for the edit form's "✨ ช่วยเติมจากเว็บไซต์".
// Server-only; returns null on any failure so the caller falls back to the no-AI draft.
import "server-only";
import { serverEnv } from "@/lib/env";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

export async function geminiJson(
  prompt: string,
  schema: object,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown | null> {
  const key = serverEnv.geminiApiKey();
  if (!key) return null;
  const model = serverEnv.geminiModel();
  if (!/^[a-z0-9.-]{1,60}$/.test(model)) return null;
  try {
    const res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.4,
            maxOutputTokens: 1200,
          },
        }),
        signal: AbortSignal.timeout(25_000),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as GeminiResponse;
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
