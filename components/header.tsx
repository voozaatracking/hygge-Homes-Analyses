"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/user-menu";

/**
 * Markenbezug als hochwertige Wortmarke.
 * Sobald die Logodatei vorliegt, kann sie unter public/brand/ abgelegt und
 * hier als <Image> eingebunden werden (dunkle Variante auf hellen Flächen).
 */
function Wordmark() {
  return (
    <Link href="/" className="group inline-flex flex-col leading-none">
      <span className="font-display text-xl sm:text-2xl tracking-[0.18em] uppercase text-ink">
        Hygge Homes
      </span>
      <span className="text-[11px] sm:text-xs tracking-[0.22em] uppercase text-taupe mt-1">
        apartments by Anna &amp; Thilo
      </span>
    </Link>
  );
}

const links = [
  { href: "/", label: "Start" },
  { href: "/object-analysis", label: "Objektanalyse" },
  { href: "/location-analysis", label: "Standortanalyse" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-card">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <Wordmark />
        <nav aria-label="Hauptnavigation" className="flex gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  active
                    ? "bg-greige text-ink"
                    : "text-muted hover:text-ink hover:bg-card-soft"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
