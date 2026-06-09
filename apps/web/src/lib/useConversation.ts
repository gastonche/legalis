import { useCallback, useRef, useState } from "react";
import type { AnswerPayload, ComponentDirective, StreamEvent } from "@legalis/contracts";

export type TurnStatus = "connecting" | "streaming" | "done" | "error";

export interface Turn {
  id: string;
  question: string;
  status: TurnStatus;
  narration: { step: string; text: string }[];
  trace: StreamEvent[];
  components: ComponentDirective[];
  answer: string; // streamed prose
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function freshTurn(id: string, question: string): Turn {
  return { id, question, status: "connecting", narration: [], trace: [], components: [], answer: "" };
}

function reduceTurn(turn: Turn, event: StreamEvent): Turn {
  switch (event.type) {
    case "narration":
      return {
        ...turn,
        narration: [...turn.narration, { step: event.step, text: event.text }],
        trace: [...turn.trace, event],
      };
    case "component":
      return { ...turn, components: [...turn.components, event.directive], trace: [...turn.trace, event] };
    case "answer-token":
      return { ...turn, answer: turn.answer + event.token, trace: [...turn.trace, event] };
    case "trace":
      return { ...turn, trace: [...turn.trace, event] };
    case "control":
      if (event.phase === "done") return { ...turn, status: "done" };
      if (event.phase === "error") return { ...turn, status: "error", error: event.error };
      return turn;
    default:
      return turn;
  }
}

/** The final answer text of a completed turn (answer card if present, else streamed prose). */
function answerText(turn: Turn): string {
  const card = turn.components.find((c) => c.component === "answer");
  return card ? (card.props as AnswerPayload).answer : turn.answer;
}

export function useConversation() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const sourceRef = useRef<EventSource | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  const busy = turns.some((t) => t.status === "connecting" || t.status === "streaming");

  const ask = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text) return;
    sourceRef.current?.close();

    // history from the last few completed turns, for context-aware follow-ups
    const history: ChatMessage[] = turnsRef.current
      .filter((t) => t.status === "done")
      .slice(-3)
      .flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: answerText(t).slice(0, 800) },
      ]);

    const id = crypto.randomUUID();
    setTurns((prev) => [...prev, freshTurn(id, text)]);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, history }),
      });
      if (!res.ok) throw new Error(`session failed (${res.status})`);
      const { sessionId } = (await res.json()) as { sessionId: string };

      const source = new EventSource(`/api/stream/${sessionId}`);
      sourceRef.current = source;
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "streaming" } : t)));

      source.onmessage = (e: MessageEvent<string>) => {
        let event: StreamEvent;
        try {
          event = JSON.parse(e.data) as StreamEvent;
        } catch {
          return;
        }
        setTurns((prev) => prev.map((t) => (t.id === id ? reduceTurn(t, event) : t)));
        if (event.type === "control" && (event.phase === "done" || event.phase === "error")) {
          source.close();
        }
      };
      source.onerror = () => {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === id && t.status !== "done" ? { ...t, status: "error", error: "stream error" } : t,
          ),
        );
        source.close();
      };
    } catch (err) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: "error", error: err instanceof Error ? err.message : "error" } : t,
        ),
      );
    }
  }, []);

  const newChat = useCallback(() => {
    sourceRef.current?.close();
    setTurns([]);
  }, []);

  return { turns, ask, newChat, busy };
}
