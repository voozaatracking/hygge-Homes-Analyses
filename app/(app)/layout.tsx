import { redirect } from "next/navigation";
import { getAccess, getSessionUser } from "@/lib/access";

/**
 * Zugangsprüfung für alle geschützten Seiten (Server-Komponente).
 * Ohne Sitzung zur Anmeldung, ohne aktiven Plan zur Seite "Kein Zugang".
 * proxy.ts leitet ohne Sitzung bereits um; hier zusätzlich Rolle, Plan
 * und Status aus profiles prüfen (Verteidigung in der Tiefe).
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const access = await getAccess(user.id);
  if (!access?.hasAccess) redirect("/no-access");
  return <>{children}</>;
}
