import {
  buildBanner,
  downgradeAnswer,
  downgradeVerdict,
  judgeAnswer,
  refusal,
  streamProse,
  structureAnswer,
  verdictPasses,
} from "@legalis/core";
import type { AnswerPayload } from "@legalis/contracts";
import type { RunContext } from "./runContext";
import { TALK_TO_LAWYER, dedupeChunks, sourcesComponent } from "./stream/shared";

/**
 * Produce the final grounded answer deterministically from the accumulated
 * sources: stream the prose, structure + validate citations, run the self-eval
 * judge, then emit sources → verification-banner → answer → talk-to-a-lawyer.
 * Shared by the finalize tool and the route's safety net.
 */
export async function produceFinalAnswer(run: RunContext): Promise<{ done: boolean; grounded: boolean }> {
  if (run.clarified) return { done: true, grounded: false };
  if (run.finalAnswer) return { done: true, grounded: run.finalAnswer.citations.length > 0 };

  const chunks = dedupeChunks(run.chunks);
  const context = run.history
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  if (chunks.length === 0) {
    const a = refusal(run.question, "No relevant sources were found.");
    run.sink.narration("synthesize", "I couldn't find grounded sources for this, so I won't guess.");
    for (const tok of a.answer.match(/\S+\s*/g) ?? [a.answer]) run.sink.token(tok);
    const banner = buildBanner(downgradeVerdict("no sources"), a);
    run.sink.component({ component: "verification-banner", props: banner });
    run.sink.component({ component: "answer", props: a });
    run.sink.component(TALK_TO_LAWYER);
    run.finalAnswer = a;
    run.verification = banner;
    return { done: true, grounded: false };
  }

  const sources = sourcesComponent(chunks);
  run.sources = sources;
  run.sink.component(sources);

  run.sink.trace("synthesize", "start");
  run.sink.narration("synthesize", "Drafting a plain-language answer, with each point tied to a source…");
  let prose = "";
  try {
    for await (const tok of streamProse(run.question, chunks, run.deps.llm, context)) {
      prose += tok;
      run.sink.token(tok);
    }
  } catch {
    /* keep whatever streamed */
  }
  run.sink.trace("synthesize", "end", prose ? "ok" : "warn");

  let answer: AnswerPayload;
  let grounded = false;
  try {
    const r = await structureAnswer(run.question, prose || "(no draft produced)", chunks, run.deps.llm);
    answer = r.answer;
    grounded = answer.citations.length > 0;
  } catch {
    answer = { ...refusal(run.question, "I couldn't structure the draft."), answer: prose || refusal(run.question, "").answer };
  }

  run.sink.trace("self-eval", "start");
  run.sink.narration("self-eval", "Before I show this, let me check it's grounded and the regime is right…");
  const verdict = grounded
    ? await judgeAnswer(run.question, answer, chunks, run.deps.llm)
    : downgradeVerdict("ungrounded draft");
  const passed = grounded && verdictPasses(verdict);
  const finalAnswer = passed ? answer : grounded ? downgradeAnswer(answer) : answer;
  const banner = buildBanner({ ...verdict, action: passed ? "show" : "downgrade" }, finalAnswer);
  run.sink.trace("self-eval", "end", passed ? "ok" : "warn", `groundedness=${verdict.groundedness.score}`);

  run.sink.component({ component: "verification-banner", props: banner });
  run.sink.component({ component: "answer", props: finalAnswer });
  run.sink.component(TALK_TO_LAWYER);

  run.finalAnswer = finalAnswer;
  run.verification = banner;
  return { done: true, grounded };
}
