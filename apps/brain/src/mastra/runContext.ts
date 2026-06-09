import { AsyncLocalStorage } from "node:async_hooks";
import type { AgentDeps, ChatMessage } from "@legalis/core";
import type {
  AnswerPayload,
  ComponentDirective,
  RetrievedChunk,
  VerificationBannerProps,
} from "@legalis/contracts";
import type { RunSink } from "./stream/sink";

/**
 * Per-request context carried to the agent's tools via AsyncLocalStorage —
 * framework-agnostic, so tools reach the sink + deps without depending on
 * Mastra's internal request-context plumbing.
 */
export interface RunContext {
  sink: RunSink;
  deps: AgentDeps;
  question: string;
  history: ChatMessage[];
  chunks: RetrievedChunk[]; // accumulated by search tools, consumed by finalize
  clarified: boolean; // set when askClarification fired → the run ends without an answer
  // set by finalize, read by the route for persistence + rehydration
  finalAnswer?: AnswerPayload;
  verification?: VerificationBannerProps;
  sources?: ComponentDirective;
}

export const runStore = new AsyncLocalStorage<RunContext>();

export function currentRun(): RunContext {
  const ctx = runStore.getStore();
  if (!ctx) throw new Error("tool executed outside a run context");
  return ctx;
}
