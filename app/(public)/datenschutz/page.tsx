import { LegalDocument } from "@/components/legal/legal-document";
import { DATENSCHUTZ_BLOCKS } from "@/lib/legal/datenschutz";

export const metadata = { title: "Datenschutz | Hygge Homes Analyse" };

export default function DatenschutzPage() {
  return <LegalDocument blocks={DATENSCHUTZ_BLOCKS} />;
}
