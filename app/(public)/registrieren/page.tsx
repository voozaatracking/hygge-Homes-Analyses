import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/access";
import { RegisterForm } from "@/components/register-form";

export const metadata = { title: "Registrieren | Hygge Homes Analyse" };

/** Selbstregistrierung; angemeldete Nutzer landen auf der Startseite. */
export default async function RegistrierenPage() {
  const user = await getSessionUser();
  if (user) redirect("/");
  return <RegisterForm />;
}
