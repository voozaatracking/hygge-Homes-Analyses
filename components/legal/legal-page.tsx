import Link from "next/link";
import { Card, Notice } from "@/components/ui";

/**
 * Gerüst für Rechtsseiten. Die Texte sind Platzhalter und vom Owner durch
 * geprüfte Inhalte zu ersetzen; es werden bewusst keine Angaben erfunden.
 */
export function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: { heading: string; placeholder: string }[];
}) {
  return (
    <div className="py-8 space-y-6 max-w-3xl">
      <h1 className="font-display text-2xl tracking-wide uppercase text-ink">{title}</h1>
      <Notice kind="warning">
        Platzhalter: Diese Seite enthält noch keine rechtsverbindlichen Inhalte.
        Die Abschnitte sind vom Owner mit geprüften Texten zu ersetzen, bevor
        die Anwendung öffentlich beworben wird.
      </Notice>
      <Card className="space-y-6">
        {sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="font-display text-base tracking-[0.12em] uppercase text-ink">
              {section.heading}
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              [Vom Owner zu ersetzen] {section.placeholder}
            </p>
          </section>
        ))}
      </Card>
      <p className="text-sm">
        <Link href="/" className="underline underline-offset-2 text-taupe hover:text-ink">
          Zur Startseite
        </Link>
      </p>
    </div>
  );
}
