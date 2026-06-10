import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnswerPayload,
  ComponentDirective,
  StreamEvent,
  VerificationBannerProps,
} from "@legalis/contracts";

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

interface StoredTurn {
  question: string;
  answer?: AnswerPayload;
  clarifier?: ComponentDirective;
  verification?: VerificationBannerProps;
  sources?: ComponentDirective;
  createdAt: string;
}

const LAWYER: ComponentDirective = {
  component: "talk-to-a-lawyer",
  props: {
    message:
      "For your specific situation — especially anything time-sensitive — a qualified Cameroonian lawyer can confirm how this applies to you.",
  },
};

/** Rebuild a completed Turn from a persisted record (for refresh rehydration). */
function turnFromStored(s: StoredTurn): Turn {
  const components: ComponentDirective[] = [];
  if (s.clarifier) {
    // a clarification turn: re-render the interactive chips
    components.push(s.clarifier, LAWYER);
  } else if (s.answer) {
    if (s.sources) components.push(s.sources);
    if (s.verification) components.push({ component: "verification-banner", props: s.verification });
    components.push({ component: "answer", props: s.answer }, LAWYER);
  }
  return {
    id: crypto.randomUUID(),
    question: s.question,
    status: "done",
    narration: [],
    trace: [],
    components,
    answer: s.answer?.answer ?? "",
  };
}

/**
 * Chat-scoped conversation. Sessions live server-side (the brain), keyed by chatId:
 * a fresh chat is minted on the first question (navigating to /c/:id), and a refresh
 * rehydrates prior turns from history. Transport is fetch + ReadableStream (POST).
 */
export function useConversation(chatId: string | null, navigate: (to: string) => void) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const localChats = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const busy = turns.some((t) => t.status === "connecting" || t.status === "streaming");

  // Rehydrate when landing on an existing chat (skip chats minted this session,
  // so an in-flight first turn isn't clobbered by an empty history fetch).
  useEffect(() => {
    if (!chatId) {
      setTurns([]);
      return;
    }
    if (localChats.current.has(chatId)) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/chat/${chatId}/history`);
        const data = (await res.json()) as { turns: StoredTurn[] };
        if (!cancelled) setTurns(data.turns.map(turnFromStored));
      } catch {
        if (!cancelled) setTurns([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const runStream = useCallback(async (id: string, question: string, turnId: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(`/api/chat/${id}/stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(`stream failed (${res.status})`);
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, status: "streaming" } : t)));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line.slice(5).trim()) as StreamEvent;
          } catch {
            continue;
          }
          setTurns((prev) => prev.map((t) => (t.id === turnId ? reduceTurn(t, event) : t)));
        }
      }
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId && t.status !== "error" ? { ...t, status: "done" } : t)),
      );
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId ? { ...t, status: "error", error: e instanceof Error ? e.message : "error" } : t,
        ),
      );
    }
  }, []);

  const ask = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;
      let id = chatId;
      if (!id) {
        id = crypto.randomUUID();
        localChats.current.add(id);
        navigate(`/c/${id}`);
      }
      const turnId = crypto.randomUUID();
      setTurns((prev) => [
        ...prev,
        { id: turnId, question: text, status: "connecting", narration: [], trace: [], components: [], answer: "" },
      ]);
      void runStream(id, text, turnId);
    },
    [chatId, navigate, runStream],
  );

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setTurns([]);
    navigate("/chat");
  }, [navigate]);

  return { turns, ask, newChat, busy };
}
