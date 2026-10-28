import { redirect } from "next/navigation";
import { getAccess, getSessionUser } from "@/lib/access";
import { Card } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";

/**
 * Konto vorhanden, aber kein aktiver Zugang (deaktiviert, kein Plan oder
 * Plan abgelaufen). Ohne Sitzung zur Anmeldung, mit Zugang zur Startseite.
 */
export default async function NoAccessPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const access = await getAccess(user.id);
  if (access?.hasAccess) redirect("/");

  const reason = !access
    ? "Für dieses Konto existiert noch kein Profil."
    : !access.active
      ? "Der Zugang wurde deaktiviert."
      : access.plan === "pro" && access.planValidUntil
        ? "Der Plan ist abgelaufen."
        : "Für dieses Konto ist kein aktiver Plan hinterlegt.";

  return (
    <div className="py-16 flex justify-center">
      <Card className="w-full max-w-md text-center py-12">
        <h1 className="font-display text-xl tracking-wide uppercase text-ink mb-2">
          Kein Zugang
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Angemeldet als <span className="text-ink">{user.email}</span>.{" "}
          {reason} Bitte an den Administrator wenden.
        </p>
        <div className="mt-6 flex justify-center">
          <LogoutButton variant="primary" />
        </div>
      </Card>
    </div>
  );
}
