import OpenAI from "openai";

export const TEXT_MODEL = "gpt-5.5";
export const IMAGE_MODEL = "gpt-image-1";

export type OpenAIClient = OpenAI;

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}
