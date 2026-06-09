import { useEffect, useRef, useState } from "react";
import { ArrowUpIcon } from "./icons";

export function Composer({
  onSubmit,
  busy,
  variant = "docked",
  autoFocus = false,
}: {
  onSubmit: (q: string) => void;
  busy: boolean;
  variant?: "hero" | "docked";
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const maxH = variant === "hero" ? 220 : 160;

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  };
  useEffect(grow, [value, maxH]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const t = value.trim();
    if (!t || busy) return;
    onSubmit(t);
    setValue("");
  };

  const hero = variant === "hero";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="group flex items-end gap-2 rounded-2xl border border-line-strong bg-surface px-3 py-2.5 shadow-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
    >
      <label htmlFor="composer" className="sr-only">
        Ask a question about Cameroon law
      </label>
      <textarea
        id="composer"
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={hero ? "Ask anything about Cameroon law…" : "Ask a follow-up…"}
        className={`flex-1 resize-none bg-transparent px-1.5 py-1.5 text-ink placeholder:text-ink-faint focus:outline-none ${hero ? "text-lg" : "text-base"}`}
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={busy || !value.trim()}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? (
          <span className="size-2.5 animate-pulse rounded-full bg-on-primary motion-reduce:animate-none" />
        ) : (
          <ArrowUpIcon className="size-5" />
        )}
      </button>
    </form>
  );
}
