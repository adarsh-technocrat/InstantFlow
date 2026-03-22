import type { ReactNode } from "react";
import { CollapsibleTLDR } from "./CollapsibleTLDR";

function Heading2({ children, id }: { children?: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="text-xl md:text-2xl font-semibold text-t-primary mt-12 mb-4 scroll-mt-20"
      style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}
    >
      {id ? <a href={`#${id}`} className="no-underline text-t-primary">{children}</a> : children}
    </h2>
  );
}

function Heading3({ children, id }: { children?: ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      className="text-lg font-semibold text-t-primary mt-8 mb-3 scroll-mt-20"
      style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}
    >
      {id ? <a href={`#${id}`} className="no-underline text-t-primary">{children}</a> : children}
    </h3>
  );
}

export const mdxComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="text-2xl md:text-3xl font-semibold text-t-primary mt-10 mb-4" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>{children}</h1>
  ),
  h2: Heading2,
  h3: Heading3,
  h4: ({ children }: { children?: ReactNode }) => (
    <h4 className="text-base font-semibold text-t-primary mt-6 mb-2">{children}</h4>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="text-[15px] md:text-base text-t-secondary leading-[1.8] mb-5">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-5 flex flex-col gap-2 pl-1">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-5 flex flex-col gap-2 pl-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="flex gap-2 text-[15px] text-t-secondary leading-[1.8]">
      <span className="text-t-tertiary mt-1 shrink-0">•</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-t-primary">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic text-t-secondary">{children}</em>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      className="text-t-primary underline underline-offset-2 decoration-b-primary hover:decoration-t-primary transition-colors"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >{children}</a>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="border-l-2 border-b-strong pl-4 my-6 text-t-secondary italic">{children}</blockquote>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-input-bg border border-b-secondary px-1.5 py-0.5 font-mono text-[13px] text-t-primary">{children}</code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="mb-5 overflow-x-auto rounded-lg bg-surface-elevated border border-b-primary p-4 font-mono text-sm text-t-secondary">{children}</pre>
  ),
  hr: () => <hr className="my-10 border-t border-b-primary" />,
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <figure className="my-8">
      <img src={src} alt={alt ?? ""} className="w-full rounded-lg border border-b-primary" loading="lazy" />
      {alt && <figcaption className="mt-2 text-center text-xs text-t-tertiary font-mono">{alt}</figcaption>}
    </figure>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mb-5 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border border-b-primary bg-input-bg px-3 py-2 text-left text-xs font-mono font-semibold uppercase tracking-wider text-t-secondary">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border border-b-secondary px-3 py-2 text-sm text-t-secondary">{children}</td>
  ),
};

// Interactive components — these are client components imported from separate files
export function TLDR({ children }: { children: ReactNode }) {
  return <CollapsibleTLDR>{children}</CollapsibleTLDR>;
}

export function Callout({ type = "info", children }: { type?: "info" | "warning" | "tip"; children: ReactNode }) {
  const styles = {
    info: "border-blue-500/20 bg-blue-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    tip: "border-green-500/20 bg-green-500/5",
  };
  const labels = { info: "Info", warning: "Warning", tip: "Tip" };

  return (
    <div className={`my-6 rounded-xl border p-5 ${styles[type]}`}>
      <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-t-tertiary mb-2 block">{labels[type]}</span>
      <div className="text-sm text-t-secondary leading-relaxed [&>p]:mb-0">{children}</div>
    </div>
  );
}

export function KeyTakeaways({ items }: { items?: string[] }) {
  if (!items || !Array.isArray(items)) return null;
  return (
    <div className="my-8 rounded-xl border border-b-strong bg-input-bg p-5">
      <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-t-tertiary mb-3 block">Key Takeaways</span>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-t-primary leading-relaxed">
            <span className="text-t-tertiary shrink-0">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
