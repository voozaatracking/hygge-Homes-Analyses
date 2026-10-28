"use client";

import { Button } from "@/components/ui";

/** Abmelden über /api/logout, danach zur Anmeldung. */
export function LogoutButton({
  variant = "ghost",
  className,
}: {
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Auch bei Netzfehler zur Login-Seite wechseln.
    }
    window.location.assign("/login");
  };
  return (
    <Button variant={variant} className={className} onClick={() => void logout()}>
      Abmelden
    </Button>
  );
}
