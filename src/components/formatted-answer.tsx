import { Fragment } from "react";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-stone-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function parseBlock(block: string) {
  const lines = block.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return null;

  if (lines.every((line) => /^[-*•]\s+/.test(line))) {
    return (
      <ul className="list-disc space-y-2 pl-5 marker:text-stone-400">
        {lines.map((line, i) => (
          <li key={i} className="pl-1 text-[15px] leading-[1.75] text-stone-700">
            {renderInline(line.replace(/^[-*•]\s+/, ""))}
          </li>
        ))}
      </ul>
    );
  }

  if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    return (
      <ol className="list-decimal space-y-2 pl-5 marker:text-stone-500">
        {lines.map((line, i) => (
          <li key={i} className="pl-1 text-[15px] leading-[1.75] text-stone-700">
            {renderInline(line.replace(/^\d+\.\s+/, ""))}
          </li>
        ))}
      </ol>
    );
  }

  const headingMatch = lines[0].match(/^(#{1,3})\s+(.+)/);
  if (lines.length === 1 && headingMatch) {
    const level = headingMatch[1].length;
    const text = headingMatch[2];
    if (level <= 2) {
      return (
        <h3 className="font-serif text-lg text-stone-900">{renderInline(text)}</h3>
      );
    }
    return (
      <h4 className="font-medium text-stone-900">{renderInline(text)}</h4>
    );
  }

  return (
    <p className="text-[15px] leading-[1.75] text-stone-700">
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderInline(line)}
        </Fragment>
      ))}
    </p>
  );
}

export function FormattedAnswer({ content }: { content: string }) {
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <Fragment key={i}>{parseBlock(block)}</Fragment>
      ))}
    </div>
  );
}
