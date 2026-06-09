import type { ComponentDirective, StepName, StreamEvent } from "@legalis/contracts";

/**
 * An async queue the agent's tools push StreamEvents into, drained by the SSE
 * route. Decouples the (model-driven, possibly-concurrent) tool execution from
 * the single ordered SSE channel — the wire format is the exact StreamEvent union
 * the SPA already renders.
 */
export class RunSink {
  private queue: StreamEvent[] = [];
  private waiters: ((r: IteratorResult<StreamEvent>) => void)[] = [];
  private closed = false;

  push(event: StreamEvent): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value: event, done: false });
    else this.queue.push(event);
  }

  trace(step: StepName, phase: "start" | "end", status: "ok" | "warn" | "error" = "ok", detail?: string): void {
    this.push(detail ? { type: "trace", step, phase, status, detail } : { type: "trace", step, phase, status });
  }
  narration(step: StepName, text: string): void {
    this.push({ type: "narration", step, text });
  }
  component(directive: ComponentDirective): void {
    this.push({ type: "component", directive });
  }
  token(token: string): void {
    this.push({ type: "answer-token", token });
  }
  control(phase: "open" | "done" | "error", error?: string): void {
    this.push(error ? { type: "control", phase, error } : { type: "control", phase });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    while (this.waiters.length) this.waiters.shift()?.({ value: undefined as never, done: true });
  }

  async *drain(): AsyncGenerator<StreamEvent> {
    for (;;) {
      if (this.queue.length) {
        yield this.queue.shift() as StreamEvent;
        continue;
      }
      if (this.closed) return;
      const next = await new Promise<IteratorResult<StreamEvent>>((resolve) => this.waiters.push(resolve));
      if (next.done) return;
      yield next.value;
    }
  }
}
