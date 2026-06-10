import { useEffect, useRef } from "react";
import { useConversation } from "./lib/useConversation";
import { chatIdFromPath, useRouter } from "./lib/router";
import { Composer } from "./components/Composer";
import { AssistantTurn, UserTurn } from "./components/Turn";
import { PlusIcon, ScaleIcon } from "./components/icons";
import { Shell } from "./pages/Shell";
import { Home } from "./pages/Home";
import { HowItWorks } from "./pages/HowItWorks";
import { Sources } from "./pages/Sources";
import { About } from "./pages/About";
import { Legal } from "./pages/Legal";

const SAMPLES = [
  "How do I register a small business in Cameroon?",
  "Can my employer dismiss me without notice?",
  "What are the grounds for divorce?",
  "What law governs a commercial company in Douala?",
];

const TITLES: Record<string, string> = {
  "/": "Legalis — grounded research on Cameroon law",
  "/chat": "Ask Legalis",
  "/how-it-works": "How Legalis works",
  "/sources": "Sources — the Legalis corpus",
  "/about": "About Legalis",
  "/terms": "Terms of use — Legalis",
  "/privacy": "Privacy — Legalis",
};

/** The app surface: /chat (composer landing) and /c/:id (conversation thread). */
function ChatApp({
  chatId,
  navigate,
  turns,
  ask,
  newChat,
  busy,
}: {
  chatId: string | null;
  navigate: (to: string) => void;
  turns: ReturnType<typeof useConversation>["turns"];
  ask: (q: string) => void;
  newChat: () => void;
  busy: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const landing = chatId === null;

  useEffect(() => {
    if (!landing) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, landing]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line/70 bg-paper/80 px-4 py-3 backdrop-blur sm:px-6">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
          className="flex items-center gap-2"
          aria-label="Legalis home"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-on-primary">
            <ScaleIcon className="size-4" />
          </span>
          <span className="font-serif text-lg font-semibold text-ink">Legalis</span>
        </a>
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
            <h1 className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              What would you like to know?
            </h1>
            <p className="mx-auto mt-3 max-w-md text-ink-soft">
              Plain-language answers, grounded in cited primary sources, with the governing regime
              flagged.
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

export function App() {
  const { path, navigate } = useRouter();
  const chatId = chatIdFromPath(path);
  const { turns, ask, newChat, busy } = useConversation(chatId, navigate);

  useEffect(() => {
    document.title = chatId ? "Legalis — conversation" : (TITLES[path] ?? TITLES["/"]);
  }, [path, chatId]);

  // App surface
  if (chatId !== null || path === "/chat") {
    return (
      <ChatApp chatId={chatId} navigate={navigate} turns={turns} ask={ask} newChat={newChat} busy={busy} />
    );
  }

  // Marketing site
  const page =
    path === "/how-it-works" ? (
      <HowItWorks />
    ) : path === "/sources" ? (
      <Sources />
    ) : path === "/about" ? (
      <About />
    ) : path === "/terms" ? (
      <Legal kind="terms" />
    ) : path === "/privacy" ? (
      <Legal kind="privacy" />
    ) : (
      <Home ask={ask} busy={busy} navigate={navigate} />
    );

  return (
    <Shell path={path} navigate={navigate}>
      {page}
    </Shell>
  );
}
