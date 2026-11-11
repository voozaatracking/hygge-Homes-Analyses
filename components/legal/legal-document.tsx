import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalBlock } from "@/lib/legal/types";
import { Card, Notice } from "@/components/ui";

/**
 * Rendert einen Rechtstext aus Blöcken (Überschriften, Absätze, Listen) in
 * lesbarer Breite. Inline werden Fettdruck (**…**), Web-Adressen und
 * Prüfhinweise ([PRÜFEN: …]) erkannt; der Wortlaut bleibt unverändert.
 * Nach einer Trennlinie beginnt ein eigener Abschnitt mit Sprungmarke
 * (AGB: Widerrufsbelehrung unter #widerruf).
 */
export function LegalDocument({
  blocks,
  anchorAfterRule,
}: {
  blocks: LegalBlock[];
  /** Sprungmarke für den Abschnitt nach der ersten Trennlinie. */
  anchorAfterRule?: string;
}) {
  const hasReviewMarks = blocks.some((b) => JSON.stringify(b).includes("[PRÜFEN"));
  const firstHeadingIndex = blocks.findIndex((b) => b.type === "h1");
  const ruleIndex = blocks.findIndex((b) => b.type === "hr");
  const anchorIndex =
    anchorAfterRule && ruleIndex >= 0
      ? blocks.findIndex((b, i) => i > ruleIndex && b.type === "h1")
      : -1;

  return (
    <div className="py-8 space-y-6 max-w-3xl">
      {hasReviewMarks ? (
        <Notice kind="warning">
          Entwurf: Dieser Text enthält noch Prüfhinweise in eckigen Klammern. Die
          endgültige Fassung folgt nach Prüfung.
        </Notice>
      ) : null}
      <Card className="space-y-4 leading-relaxed">
        {blocks.map((block, index) => {
          switch (block.type) {
            case "h1": {
              const isDoc = index === firstHeadingIndex;
              const id = index === anchorIndex ? anchorAfterRule : undefined;
              return (
                <h1
                  key={index}
                  id={id}
                  className={`font-display tracking-wide uppercase text-ink scroll-mt-24 ${
                    isDoc ? "text-2xl" : "text-xl pt-4"
                  }`}
                >
                  {block.text}
                </h1>
              );
            }
            case "h2":
              return (
                <h2
                  key={index}
                  className="font-display text-base tracking-[0.12em] uppercase text-ink pt-3"
                >
                  {block.text}
                </h2>
              );
            case "p":
              return (
                <p key={index} className="text-sm text-ink whitespace-pre-line">
                  {inline(block.text)}
                </p>
              );
            case "hr":
              return <hr key={index} className="border-line my-6" />;
            case "ul":
              return (
                <ul key={index} className="list-disc pl-6 space-y-1 text-sm text-ink">
                  {block.items.map((item, j) => (
                    <li key={j}>{inline(item)}</li>
                  ))}
                </ul>
              );
            case "ol":
              return (
                <ol key={index} className="list-decimal pl-6 space-y-2 text-sm text-ink">
                  {block.items.map((item, j) => (
                    <li key={j}>
                      {inline(item.text)}
                      {item.sub.length > 0 ? (
                        <ul className="list-disc pl-6 mt-1 space-y-1">
                          {item.sub.map((s, k) => (
                            <li key={k}>{inline(s)}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              );
          }
        })}
      </Card>
      <p className="text-sm flex flex-wrap gap-x-4">
        <Link href="/login" className="underline underline-offset-2 text-taupe hover:text-ink">
          Zur Anmeldung
        </Link>
        <Link href="/" className="underline underline-offset-2 text-taupe hover:text-ink">
          Zur Startseite
        </Link>
      </p>
    </div>
  );
}

/** Inline-Auszeichnung: Fettdruck, Web-Adressen, Prüfhinweise. */
export function inline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\[PRÜFEN[^\]]*\]|https?:\/\/[^\s)]+)/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[PRÜFEN")) {
      parts.push(
        <mark key={key++} className="bg-ochre-soft text-ink px-1 rounded">
          {token}
        </mark>
      );
    } else {
      const trailing = token.match(/[.,;:]+$/)?.[0] ?? "";
      const url = trailing ? token.slice(0, -trailing.length) : token;
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 text-taupe hover:text-ink break-all"
        >
          {url}
        </a>
      );
      if (trailing) parts.push(trailing);
    }
    last = index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
