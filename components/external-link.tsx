import type { ReactNode } from "react";

export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children?: ReactNode;
}) {
  let safe: string | null = null;
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      safe = url.toString();
    }
  } catch {
    safe = null;
  }
  if (!safe) {
    return <span className="break-all">{children ?? href}</span>;
  }
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
    >
      {children ?? safe}
    </a>
  );
}
