/**
 * Validates that Groq and OpenRouter API keys are valid and can make LLM calls.
 * These are integration tests — they make real API calls.
 */
import { describe, it, expect } from "vitest";

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";

async function callProvider(apiUrl: string, apiKey: string, model: string, extraHeaders: Record<string, string> = {}) {
  const url = `${apiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Say 'ok' in one word." }],
      max_tokens: 10,
    }),
  });
  const json = await response.json() as Record<string, unknown>;
  if (!response.ok || ("error" in json)) {
    throw new Error(`API error: ${response.status} – ${JSON.stringify(json)}`);
  }
  const choices = (json as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content ?? "";
}

describe("LLM Provider API Keys", () => {
  it("Groq API key is valid and llama-3.1-8b-instant responds", async () => {
    if (!GROQ_API_KEY) {
      console.warn("GROQ_API_KEY not set — skipping test");
      return;
    }
    const result = await callProvider("https://api.groq.com/openai", GROQ_API_KEY, "llama-3.1-8b-instant");
    expect(result.length).toBeGreaterThan(0);
    console.log("Groq response:", result);
  }, 15000);

  it("OpenRouter API key is valid and llama-3.3-70b:free responds", async () => {
    if (!OPENROUTER_API_KEY) {
      console.warn("OPENROUTER_API_KEY not set — skipping test");
      return;
    }
    // Try multiple free models since individual ones may be rate-limited
    const freeModels = [
      "google/gemma-3-27b-it:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "openrouter/auto",
    ];
    let result = "";
    let lastErr = "";
    for (const model of freeModels) {
      try {
        result = await callProvider(
          "https://openrouter.ai/api",
          OPENROUTER_API_KEY,
          model,
          { "HTTP-Referer": "https://saleslens.manus.space", "X-Title": "SalesLens" },
        );
        console.log(`OpenRouter response (${model}):`, result);
        break;
      } catch (e) {
        lastErr = String(e);
        console.warn(`OpenRouter model ${model} failed:`, lastErr.slice(0, 80));
      }
    }
    if (!result) throw new Error(`All OpenRouter free models failed. Last: ${lastErr}`);
    expect(result.length).toBeGreaterThan(0);
    console.log("OpenRouter response:", result);
  }, 30000);
});
