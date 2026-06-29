import OpenAI from "openai";
import type { z } from "zod";

export type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

function getClient(): OpenAI | null {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function chatText(
  model: string,
  messages: ChatMessage[],
  maxTokens = 300
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    });
    return res.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function chatJson<T extends z.ZodType>(
  model: string,
  messages: ChatMessage[],
  schema: T,
  maxTokens = 800
): Promise<z.infer<T> | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    });

    const raw = res.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
