import type { LLMCompletionInput, LLMProvider } from "../ports";

/**
 * OpenAI Chat Completions provider (default frontier model for synthesis + judge).
 * Uses fetch only (runs in Node and on Workers). The API key is passed in — it
 * comes from a Worker secret, never the client.
 */
export class OpenAIProvider implements LLMProvider {
  readonly name: string;
  constructor(
    private apiKey: string,
    private model = "gpt-4o-mini",
    private baseUrl = "https://api.openai.com/v1",
  ) {
    this.name = `openai:${model}`;
  }

  private body(input: LLMCompletionInput, stream: boolean) {
    return JSON.stringify({
      model: this.model,
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 1500,
      ...(input.json ? { response_format: { type: "json_object" } } : {}),
      ...(stream ? { stream: true } : {}),
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ],
    });
  }

  async complete(input: LLMCompletionInput): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: this.body(input, false),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content ?? "";
  }

  async *stream(input: LLMCompletionInput): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: this.body(input, true),
    });
    if (!res.ok || !res.body) throw new Error(`OpenAI stream ${res.status}: ${await res.text()}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          /* ignore keepalive/partial */
        }
      }
    }
  }
}
