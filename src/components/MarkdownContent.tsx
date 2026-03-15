import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent = ({ content, className }: MarkdownContentProps) => {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="text-neon underline underline-offset-4"
            />
          ),
          code: ({ inline, className: codeClassName, children, ...props }) =>
            inline ? (
              <code
                {...props}
                className={`rounded bg-background/60 px-1 py-0.5 font-mono-tech text-[0.9em] ${codeClassName ?? ""}`.trim()}
              >
                {children}
              </code>
            ) : (
              <code {...props} className={codeClassName}>
                {children}
              </code>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
