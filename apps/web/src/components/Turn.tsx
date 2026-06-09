import type { AnswerPayload, ComponentDirective, VerificationBannerProps } from "@legalis/contracts";
import type { Turn } from "../lib/useConversation";
import { Answer } from "./Answer";
import { Thinking } from "./Thinking";
import { BriefcaseIcon, HelpIcon, PinIcon, ScaleIcon } from "./icons";

export function UserTurn({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-line-strong bg-surface-2 px-4 py-2.5 text-ink">
        {text}
      </div>
    </div>
  );
}

/** Interactive clarifying-question / region-selector chips that re-ask as a follow-up. */
function Chips({
  directive,
  onAsk,
  question,
}: {
  directive: ComponentDirective;
  onAsk: (q: string) => void;
  question: string;
}) {
  if (directive.component === "clarifying-question") {
    return (
      <ChipCard icon="help" title="A quick question" prompt={directive.props.question}>
        {directive.props.options.map((o) => (
          <Chip key={o.id} label={o.label} hint={o.hint} onAsk={onAsk} />
        ))}
      </ChipCard>
    );
  }
  if (directive.component === "region-selector") {
    // Re-ask the original question scoped to the chosen region, so retrieval stays on-topic.
    const askRegion = (label: string) => onAsk(`${question} — for the ${label} region of Cameroon`);
    return (
      <ChipCard icon="pin" title="Which region applies?" prompt={directive.props.reason}>
        {directive.props.regions.map((r) => (
          <Chip key={r.id} label={r.label} onAsk={askRegion} />
        ))}
      </ChipCard>
    );
  }
  return null;
}

function ChipCard({
  icon,
  title,
  prompt,
  children,
}: {
  icon: "help" | "pin";
  title: string;
  prompt: string;
  children: React.ReactNode;
}) {
  const Icon = icon === "pin" ? PinIcon : HelpIcon;
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-ink">
        <Icon className="size-4 text-primary" /> {title}
      </p>
      <p className="text-sm text-ink-soft">{prompt}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ label, hint, onAsk }: { label: string; hint?: string; onAsk: (q: string) => void }) {
  return (
    <button
      type="button"
      title={hint}
      onClick={() => onAsk(label)}
      className="min-h-9 rounded-chip border border-line-strong bg-paper px-3 text-sm text-ink transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-ink"
    >
      {label}
    </button>
  );
}

export function AssistantTurn({ turn, onAsk }: { turn: Turn; onAsk: (q: string) => void }) {
  const find = (c: ComponentDirective["component"]) => turn.components.find((d) => d.component === c);
  const answerDir = find("answer");
  const sources = find("sources");
  const verification = find("verification-banner");
  const lawyer = find("talk-to-a-lawyer");
  const clarifiers = turn.components.filter(
    (d) => d.component === "clarifying-question" || d.component === "region-selector",
  );
  const streaming = turn.status === "connecting" || turn.status === "streaming";
  const answer = answerDir?.component === "answer" ? (answerDir.props as AnswerPayload) : null;
  const verif =
    verification?.component === "verification-banner"
      ? (verification.props as VerificationBannerProps)
      : undefined;

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <ScaleIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {(turn.narration.length > 0 || streaming) && (
          <Thinking
            narration={turn.narration}
            sources={sources}
            verification={verification}
            trace={turn.trace}
            streaming={streaming}
          />
        )}

        {clarifiers.map((c, i) => (
          <Chips key={i} directive={c} onAsk={onAsk} question={turn.question} />
        ))}

        {answer ? (
          <Answer answer={answer} verification={verif} />
        ) : streaming && turn.answer ? (
          <p className="caret-pulse max-w-[68ch] font-serif text-[1.0625rem] leading-relaxed text-ink-soft">
            {turn.answer}
          </p>
        ) : null}

        {lawyer?.component === "talk-to-a-lawyer" && answer ? (
          <p className="flex items-start gap-1.5 text-xs text-ink-faint">
            <BriefcaseIcon className="mt-0.5 size-3.5 shrink-0" />
            {lawyer.props.message}
          </p>
        ) : null}

        {turn.status === "error" ? (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {turn.error ?? "Something went wrong."} — is the Worker running on :8787?
          </p>
        ) : null}
      </div>
    </div>
  );
}
