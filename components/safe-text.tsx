import type { ReactNode } from "react";
import { ExternalLink } from "@/components/external-link";

const TOKEN = /(\*\*[^*]+\*\*|https?:\/\/[^\s)）<>]+)/g;

function renderInline(text: string) {
  const nodes: ReactNode[] = [];
  const re = new RegExp(TOKEN.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      const href = token.replace(/[.,，。]+$/, "");
      nodes.push(
        <ExternalLink key={key} href={href}>
          {token}
        </ExternalLink>,
      );
    }
    key += 1;
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function SafeText({ text }: { text: string }) {
  return (
    <div className="text-sm leading-7 break-words whitespace-pre-wrap">
      {renderInline(text)}
    </div>
  );
}
