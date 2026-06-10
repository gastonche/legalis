import type { ReactNode } from "react";
import { ScaleIcon } from "../components/icons";

const NAV = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/sources", label: "Sources" },
  { to: "/about", label: "About" },
];

/** Marketing-site chrome: header with nav + "Open Legalis" CTA, and the footer. */
export function Shell({
  path,
  navigate,
  children,
}: {
  path: string;
  navigate: (to: string) => void;
  children: ReactNode;
}) {
  const link = (to: string) =>
    `min-h-9 inline-flex items-center rounded-lg px-3 text-sm transition-colors ${
      path === to ? "text-primary-ink font-medium" : "text-ink-soft hover:text-ink"
    }`;
  const go = (to: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(to);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/" onClick={go("/")} className="flex items-center gap-2" aria-label="Legalis home">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-on-primary">
              <ScaleIcon className="size-4" />
            </span>
            <span className="font-serif text-lg font-semibold text-ink">Legalis</span>
          </a>
          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
            {NAV.map((n) => (
              <a key={n.to} href={n.to} onClick={go(n.to)} className={link(n.to)} aria-current={path === n.to ? "page" : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <a
            href="/chat"
            onClick={go("/chat")}
            className="inline-flex min-h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Open Legalis
          </a>
        </div>
        <nav aria-label="Main mobile" className="flex justify-center gap-1 border-t border-line/50 px-4 py-1.5 sm:hidden">
          {NAV.map((n) => (
            <a key={n.to} href={n.to} onClick={go(n.to)} className={link(n.to)} aria-current={path === n.to ? "page" : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>

      <main id="main" className="relative z-10 flex-1">
        {children}
      </main>

      <footer className="relative z-10 border-t border-line/70">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div className="max-w-xs">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary text-on-primary">
                  <ScaleIcon className="size-3.5" />
                </span>
                <span className="font-serif font-semibold text-ink">Legalis</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                Grounded research on Cameroon law — every answer cited to verified primary sources,
                in plain language. Legal information, not legal advice.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Product</p>
                <ul className="space-y-1.5">
                  <li><a className="text-ink-soft hover:text-ink" href="/chat" onClick={go("/chat")}>Open Legalis</a></li>
                  <li><a className="text-ink-soft hover:text-ink" href="/how-it-works" onClick={go("/how-it-works")}>How it works</a></li>
                  <li><a className="text-ink-soft hover:text-ink" href="/sources" onClick={go("/sources")}>Sources</a></li>
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Company</p>
                <ul className="space-y-1.5">
                  <li><a className="text-ink-soft hover:text-ink" href="/about" onClick={go("/about")}>About</a></li>
                  <li><a className="text-ink-soft hover:text-ink" href="/terms" onClick={go("/terms")}>Terms of use</a></li>
                  <li><a className="text-ink-soft hover:text-ink" href="/privacy" onClick={go("/privacy")}>Privacy</a></li>
                </ul>
              </div>
            </div>
          </div>
          <p className="mt-8 border-t border-line pt-4 text-[0.6875rem] text-ink-faint">
            © {new Date().getFullYear()} Legalis. Legalis provides legal information, not legal advice —
            for your specific situation, consult a qualified Cameroonian lawyer.
          </p>
        </div>
      </footer>
    </div>
  );
}
