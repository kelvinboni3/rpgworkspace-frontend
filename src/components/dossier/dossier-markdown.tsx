import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function DossierMarkdown({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="text-primary font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => (
            <h4 className="font-display text-primary mt-3 mb-1 text-sm tracking-wide uppercase">
              {children}
            </h4>
          ),
          h2: ({ children }) => (
            <h4 className="font-display text-primary mt-3 mb-1 text-sm tracking-wide uppercase">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h4 className="font-display text-primary mt-3 mb-1 text-xs tracking-wide uppercase">
              {children}
            </h4>
          ),
          blockquote: ({ children }) => <div className="dossier-quote">{children}</div>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="border-border/60 my-3" />,
          code: ({ children }) => (
            <code className="bg-background/60 rounded px-1 py-0.5 font-mono text-xs">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="mb-2 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-border/60 border-b">{children}</tr>,
          th: ({ children }) => (
            <th className="font-display text-primary border-border/60 border-b px-2 py-1.5 text-left text-xs tracking-wide uppercase">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="px-2 py-1.5 align-top">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
