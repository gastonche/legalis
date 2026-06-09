import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChatMessage } from "@legalis/core";
import type { AnswerPayload, ComponentDirective, VerificationBannerProps } from "@legalis/contracts";

/**
 * Brain-owned conversation store: one JSON file per chatId holding full turn
 * records (question + the structured cited answer + verification + sources). This
 * gives (a) server-side memory the agent sees as prior messages, and (b) faithful
 * SPA rehydration after a refresh — the full cited answer re-renders, not just
 * prose. Survives process restarts. (A Mastra Memory / D1 store is the prod swap.)
 */
export interface StoredTurn {
  question: string;
  answer: AnswerPayload;
  verification?: VerificationBannerProps;
  sources?: ComponentDirective;
  createdAt: string;
}

const DIR = path.resolve(process.cwd(), "data", "chats");
const fileFor = (chatId: string): string =>
  path.join(DIR, `${chatId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);

export async function loadTurns(chatId: string): Promise<StoredTurn[]> {
  try {
    return JSON.parse(await readFile(fileFor(chatId), "utf8")) as StoredTurn[];
  } catch {
    return [];
  }
}

export async function appendTurn(chatId: string, turn: StoredTurn): Promise<void> {
  await mkdir(DIR, { recursive: true });
  const turns = await loadTurns(chatId);
  turns.push(turn);
  await writeFile(fileFor(chatId), JSON.stringify(turns), "utf8");
}

/** Prior turns as chat messages for agent context (assistant text trimmed). */
export function toMessages(turns: StoredTurn[]): ChatMessage[] {
  return turns.flatMap((t) => [
    { role: "user" as const, content: t.question },
    { role: "assistant" as const, content: t.answer.answer.slice(0, 800) },
  ]);
}
