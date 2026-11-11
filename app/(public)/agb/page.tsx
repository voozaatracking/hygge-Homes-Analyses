import { LegalDocument } from "@/components/legal/legal-document";
import { AGB_BLOCKS } from "@/lib/legal/agb";

export const metadata = { title: "AGB | Hygge Homes Analyse" };

/** AGB mit der Widerrufsbelehrung als eigenem Abschnitt unter #widerruf. */
export default function AgbPage() {
  return <LegalDocument blocks={AGB_BLOCKS} anchorAfterRule="widerruf" />;
}
