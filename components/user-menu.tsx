"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Me {
  username: string;
  role: "admin" | "member";
}

/**
 * Zeigt den angemeldeten Nutzer, den Verwaltungslink (nur Admins) und
 * die Abmeldung. Auf der Login-Seite oder ohne Sitzung erscheint nichts.
 */
export function UserMenu() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setMe(null);
          return;
        }
        const body = (await response.json()) as Me;
        if (!cancelled) setMe(body);
      } catch {
        if (!cancelled) setMe(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!me) return null;

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Auch bei Netzfehler zur Login-Seite wechseln.
    }
    window.location.assign("/login");
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-muted px-2" title={`Angemeldet als ${me.username}`}>
        {me.username}
      </span>
      {me.role === "admin" ? (
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className={`px-3 py-1.5 rounded-full transition-colors ${
            pathname.startsWith("/admin")
              ? "bg-greige text-ink"
              : "text-muted hover:text-ink hover:bg-card-soft"
          }`}
        >
          Verwaltung
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void logout()}
        className="px-3 py-1.5 rounded-full text-muted hover:text-ink hover:bg-card-soft transition-colors"
      >
        Abmelden
      </button>
    </div>
  );
}
