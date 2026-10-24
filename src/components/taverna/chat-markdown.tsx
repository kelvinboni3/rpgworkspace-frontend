import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown estilo chat: negrito/itálico/código/links/listas, sem títulos gigantes. */
export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed break-words [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap [&:not(:last-child)]:mb-1">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="opacity-70">{children}</del>,
          ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-5">{children}</ol>,
          h1: ({ children }) => <p className="font-semibold">{children}</p>,
          h2: ({ children }) => <p className="font-semibold">{children}</p>,
          h3: ({ children }) => <p className="font-semibold">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="border-muted-foreground/40 my-1 border-l-4 pl-3">{children}</blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-sky-500 hover:underline">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <a href={typeof src === "string" ? src : undefined} target="_blank" rel="noreferrer noopener">
              <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} className="my-1 max-h-80 max-w-full rounded-md" loading="lazy" />
            </a>
          ),
          pre: ({ children }) => (
            <pre className="bg-background/70 border-border/60 my-1 overflow-x-auto rounded-md border p-2 font-mono text-xs [&>code]:bg-transparent [&>code]:p-0">
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code className="bg-background/70 rounded px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
          ),
          hr: () => <hr className="border-border/60 my-2" />,
          table: ({ children }) => (
            <div className="my-1 overflow-x-auto">
              <table className="border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-border/60 border px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-border/60 border px-2 py-1">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
