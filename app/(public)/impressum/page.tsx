import { LegalDocument } from "@/components/legal/legal-document";
import { IMPRESSUM_BLOCKS } from "@/lib/legal/impressum";

export const metadata = { title: "Impressum | Hygge Homes Analyse" };

export default function ImpressumPage() {
  return <LegalDocument blocks={IMPRESSUM_BLOCKS} />;
}
