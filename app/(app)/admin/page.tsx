import { redirect } from "next/navigation";
import { getAccess, getSessionUser } from "@/lib/access";
import { AdminPanel } from "@/components/admin-panel";

/** Nutzerverwaltung, nur für Admins (Rolle serverseitig aus profiles). */
export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const access = await getAccess(user.id);
  if (!access?.hasAccess) redirect("/no-access");
  if (!access.isAdmin) redirect("/");
  return <AdminPanel selfId={access.userId} />;
}
