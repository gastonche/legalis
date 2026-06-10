import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/**
 * Answer markdown, rendered properly (react-markdown + GFM) and styled for the
 * Counsel system. Citation markers like [1] / [n:1] are rewritten to #cite-n
 * links pre-parse and rendered as brass superscripts — no raw-HTML plugins.
 */

/** `[1]` → `[1](#cite-1)` — but never touch a real markdown link `[text](url)`. */
function linkifyCitations(text: string): string {
  return text.replace(/\[(?:n:)?(\d+)\](?!\()/g, "[$1](#cite-$1)");
}

const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-4 font-serif text-xl font-semibold text-ink first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 font-serif text-lg font-semibold text-ink first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1.5 mt-3 font-serif text-base font-semibold text-ink first:mt-0">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-line-strong pl-3 italic text-ink-faint">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-sunken px-1 py-0.5 font-mono text-[0.85em] text-ink-soft">{children}</code>
  ),
  hr: () => <hr className="my-4 border-line" />,
  a: ({ href, children }) => {
    const cite = href?.match(/^#cite-(\d+)$/);
    if (cite) {
      return (
        <sup className="ml-0.5 rounded bg-primary-soft px-1 text-[0.62em] font-bold text-primary-ink">
          {cite[1]}
        </sup>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-primary underline decoration-primary/40 hover:text-primary-hover">
        {children}
      </a>
    );
  },
};

export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {linkifyCitations(text)}
    </ReactMarkdown>
  );
}
