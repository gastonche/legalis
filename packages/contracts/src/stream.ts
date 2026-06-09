import { z } from "zod";
import { StepName } from "./common";
import { ComponentDirective } from "./components";

/**
 * The four domain stream-event kinds emitted by the agent core, plus a
 * transport-level `control` frame for stream lifecycle. All are sent over SSE
 * as `data: <StreamEvent JSON>\n\n`.
 *
 *  - trace          → technical step log (start/end, status)
 *  - narration      → warm, first-person status line for the user
 *  - component      → adaptive UI directive (from the typed registry)
 *  - answer-token   → a streamed chunk of the synthesized answer text
 *  - control        → transport lifecycle: open / done / error
 */

export const TraceEvent = z.object({
  type: z.literal("trace"),
  step: StepName,
  phase: z.enum(["start", "end"]),
  status: z.enum(["ok", "warn", "error"]),
  detail: z.string().optional(),
  durationMs: z.number().optional(),
});
export type TraceEvent = z.infer<typeof TraceEvent>;

export const NarrationEvent = z.object({
  type: z.literal("narration"),
  step: StepName,
  text: z.string(),
});
export type NarrationEvent = z.infer<typeof NarrationEvent>;

export const ComponentEvent = z.object({
  type: z.literal("component"),
  directive: ComponentDirective,
});
export type ComponentEvent = z.infer<typeof ComponentEvent>;

export const AnswerTokenEvent = z.object({
  type: z.literal("answer-token"),
  token: z.string(),
});
export type AnswerTokenEvent = z.infer<typeof AnswerTokenEvent>;

export const ControlEvent = z.object({
  type: z.literal("control"),
  phase: z.enum(["open", "done", "error"]),
  error: z.string().optional(),
});
export type ControlEvent = z.infer<typeof ControlEvent>;

export const StreamEvent = z.discriminatedUnion("type", [
  TraceEvent,
  NarrationEvent,
  ComponentEvent,
  AnswerTokenEvent,
  ControlEvent,
]);
export type StreamEvent = z.infer<typeof StreamEvent>;
export type StreamEventType = StreamEvent["type"];
