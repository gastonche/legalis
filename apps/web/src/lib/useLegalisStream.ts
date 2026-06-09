import { useCallback, useRef, useState } from "react";
import type { ComponentDirective, StreamEvent } from "@legalis/contracts";

export interface NarrationLine {
  step: string;
  text: string;
}

export interface StreamState {
  status: "idle" | "connecting" | "streaming" | "done" | "error";
  narration: NarrationLine[];
  trace: StreamEvent[];
  components: ComponentDirective[];
  answer: string;
  error?: string;
}

const INITIAL: StreamState = {
  status: "idle",
  narration: [],
  trace: [],
  components: [],
  answer: "",
};

function reduce(state: StreamState, event: StreamEvent): StreamState {
  switch (event.type) {
    case "narration":
      return {
        ...state,
        narration: [...state.narration, { step: event.step, text: event.text }],
        trace: [...state.trace, event],
      };
    case "component":
      return {
        ...state,
        components: [...state.components, event.directive],
        trace: [...state.trace, event],
      };
    case "answer-token":
      return { ...state, answer: state.answer + event.token, trace: [...state.trace, event] };
    case "trace":
      return { ...state, trace: [...state.trace, event] };
    case "control":
      if (event.phase === "done") return { ...state, status: "done" };
      if (event.phase === "error") return { ...state, status: "error", error: event.error };
      return state;
    default:
      return state;
  }
}

/**
 * Two-step SSE client: POST /api/sessions to stash the question, then open an
 * EventSource on /api/stream/:id and fold each typed StreamEvent into UI state.
 */
export function useLegalisStream() {
  const [state, setState] = useState<StreamState>(INITIAL);
  const sourceRef = useRef<EventSource | null>(null);

  const ask = useCallback(async (question: string) => {
    sourceRef.current?.close();
    setState({ ...INITIAL, status: "connecting" });
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`session failed (${res.status})`);
      const { sessionId } = (await res.json()) as { sessionId: string };

      const source = new EventSource(`/api/stream/${sessionId}`);
      sourceRef.current = source;
      setState((s) => ({ ...s, status: "streaming" }));

      source.onmessage = (e: MessageEvent<string>) => {
        let event: StreamEvent;
        try {
          event = JSON.parse(e.data) as StreamEvent;
        } catch {
          return;
        }
        setState((s) => reduce(s, event));
        if (event.type === "control" && (event.phase === "done" || event.phase === "error")) {
          source.close();
        }
      };

      source.onerror = () => {
        setState((s) =>
          s.status === "done" ? s : { ...s, status: "error", error: "stream error" },
        );
        source.close();
      };
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "unknown error",
      }));
    }
  }, []);

  return { state, ask };
}
