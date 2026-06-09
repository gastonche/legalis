import { useEffect, useRef } from "react";
import { useConversation } from "./lib/useConversation";
import { chatIdFromPath, useRouter } from "./lib/router";
import { Composer } from "./components/Composer";
import { AssistantTurn, UserTurn } from "./components/Turn";
import { PlusIcon, ScaleIcon } from "./components/icons";

const SAMPLES = [
  "How do I register a small business in Cameroon?",
  "Can my employer dismiss me without notice?",
  "What are the grounds for divorce?",
  "What law governs a commercial company in Douala?",
];

export function App() {
  const { path, navigate } = useRouter();
  const chatId = chatIdFromPath(path);
  const { turns, ask, newChat, busy } = useConversation(chatId, navigate);
  const bottomRef = useRef<HTMLDivElement>(null);
  const landing = chatId === null;

  useEffect(() => {
    if (!landing) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, landing]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line/70 bg-paper/80 px-4 py-3 backdrop-blur sm:px-6">
        <button type="button" onClick={newChat} className="flex items-center gap-2" aria-label="Legalis — new chat">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-on-primary">
            <ScaleIcon className="size-4" />
          </span>
          <span className="font-serif text-lg font-semibold text-ink">Legalis</span>
        </button>
        {!landing ? (
          <button
            type="button"
            onClick={newChat}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong"
          >
            <PlusIcon className="size-4" /> New chat
          </button>
        ) : null}
      </header>

      {landing ? (
        <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-7 px-4 py-12">
          <div className="text-center">
            <p className="mb-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-primary">
              Grounded legal research
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-[3rem]">
              Cameroon law, <span className="italic text-primary-ink">in plain language</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-ink-soft">
              Ask a question and get a clear answer — grounded in cited primary sources, with the
              governing legal regime flagged.
            </p>
          </div>
          <div className="w-full">
            <Composer onSubmit={ask} busy={busy} variant="hero" autoFocus />
            <p className="mt-2.5 px-1 text-center text-xs text-ink-faint">
              Legal information, not legal advice — for your situation, consult a qualified Cameroonian
              lawyer.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-primary hover:text-primary-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </main>
      ) : (
        <>
          <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 space-y-7 px-4 py-6 sm:px-6">
            {turns.map((t) => (
              <div key={t.id} className="space-y-3">
                <UserTurn text={t.question} />
                <AssistantTurn turn={t} onAsk={ask} />
              </div>
            ))}
            <div ref={bottomRef} className="h-px" />
          </main>
          <div className="sticky bottom-0 z-20 border-t border-line/70 bg-paper/85 backdrop-blur">
            <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
              <Composer onSubmit={ask} busy={busy} />
              <p className="mt-1.5 text-center text-[0.6875rem] text-ink-faint">
                Legal information, not advice. Answers are grounded in cited sources; verify with a
                Cameroonian lawyer.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
