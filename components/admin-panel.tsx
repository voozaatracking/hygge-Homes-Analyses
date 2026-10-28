"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Plan, Role } from "@/lib/access";
import { fmtDateTime } from "@/lib/format";
import { Button, Card, ConfirmDialog, Notice, SectionTitle } from "@/components/ui";

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  plan: Plan;
  planValidUntil: string | null;
  active: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
}

const inputClass =
  "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe";
const headerCell =
  "px-3 py-2 text-left text-[11px] uppercase tracking-[0.08em] text-muted font-normal whitespace-nowrap";
const bodyCell = "px-3 py-2 align-middle";

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", member: "Mitglied" };
const PLAN_LABEL: Record<Plan, string> = {
  none: "kein Plan",
  internal: "Intern",
  pro: "Pro",
};

/** ISO-Zeitstempel in den Wert eines <input type="date"> umwandeln. */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Datum aus <input type="date"> als Ende des Tages (UTC) oder null. */
function fromDateInput(value: string): string | null {
  if (!value) return null;
  return `${value}T23:59:59.000Z`;
}

/**
 * Nutzerverwaltung (nur Admins). Einladen per E-Mail, Rolle, Plan und
 * Gültigkeit setzen, deaktivieren und aktivieren, löschen.
 * Der eigene Zugang ist gegen Herabstufen, Deaktivieren und Löschen geschützt
 * (zusätzlich serverseitig in /api/admin/users).
 */
export function AdminPanel({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [invitePlan, setInvitePlan] = useState<Plan>("internal");
  const [inviteValidUntil, setInviteValidUntil] = useState("");
  const [pending, setPending] = useState(false);

  const [planTarget, setPlanTarget] = useState<AdminUser | null>(null);
  const [planValue, setPlanValue] = useState<Plan>("internal");
  const [planValidUntil, setPlanValidUntil] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        users?: AdminUser[];
        error?: string;
      } | null;
      if (!response.ok || !body?.ok || !body.users) {
        setMessage({
          kind: "error",
          text: body?.error ?? "Die Nutzerliste konnte nicht geladen werden.",
        });
        setUsers([]);
        return;
      }
      setUsers(body.users);
    } catch {
      setMessage({
        kind: "error",
        text: "Die Nutzerliste konnte nicht geladen werden.",
      });
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    // Entkoppelt vom Render-Zyklus; alle setState-Aufrufe folgen erst nach dem fetch.
    const timeout = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadUsers]);

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          plan: invitePlan,
          planValidUntil: fromDateInput(inviteValidUntil),
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        email?: string;
      } | null;
      if (!response.ok || !body?.ok) {
        setMessage({
          kind: "error",
          text: body?.error ?? "Einladung fehlgeschlagen.",
        });
      } else {
        setMessage({
          kind: "success",
          text: `Einladung an ${body.email ?? inviteEmail} versendet. Die Person setzt ihr Passwort über den Link in der E-Mail.`,
        });
        setInviteEmail("");
        setInviteRole("member");
        setInvitePlan("internal");
        setInviteValidUntil("");
        await loadUsers();
      }
    } catch {
      setMessage({ kind: "error", text: "Einladung fehlgeschlagen." });
    } finally {
      setPending(false);
    }
  };

  const patchUser = async (payload: Record<string, string | null>) => {
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !body?.ok) {
        setMessage({
          kind: "error",
          text: body?.error ?? "Änderung fehlgeschlagen.",
        });
        return false;
      }
      await loadUsers();
      return true;
    } catch {
      setMessage({ kind: "error", text: "Änderung fehlgeschlagen." });
      return false;
    }
  };

  const removeUser = async (id: string) => {
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !body?.ok) {
        setMessage({
          kind: "error",
          text: body?.error ?? "Löschen fehlgeschlagen.",
        });
      } else {
        setMessage({ kind: "success", text: "Zugang und Datenstand entfernt." });
        await loadUsers();
      }
    } catch {
      setMessage({ kind: "error", text: "Löschen fehlgeschlagen." });
    }
  };

  return (
    <div className="py-8 space-y-6">
      <h1 className="font-display text-2xl tracking-wide uppercase text-ink">
        Verwaltung
      </h1>

      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      <Card>
        <SectionTitle hint="Die eingeladene Person erhält eine E-Mail mit einem Link, über den sie ihr Passwort setzt. Plan „Intern“ für Konten ohne Payment, „Pro“ mit optionalem Gültigkeitsdatum.">
          Per E-Mail einladen
        </SectionTitle>
        <form
          onSubmit={invite}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
        >
          <div className="lg:col-span-2">
            <label htmlFor="invite-email" className="block text-sm text-ink mb-1.5">
              E-Mail-Adresse
            </label>
            <input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="name@beispiel.de"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="block text-sm text-ink mb-1.5">
              Rolle
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value === "admin" ? "admin" : "member")
              }
              className={inputClass}
            >
              <option value="member">Mitglied</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="invite-plan" className="block text-sm text-ink mb-1.5">
              Plan
            </label>
            <select
              id="invite-plan"
              value={invitePlan}
              onChange={(event) => setInvitePlan(event.target.value as Plan)}
              className={inputClass}
            >
              <option value="internal">Intern</option>
              <option value="pro">Pro</option>
              <option value="none">kein Plan</option>
            </select>
          </div>
          <div>
            <label htmlFor="invite-valid" className="block text-sm text-ink mb-1.5">
              Gültig bis (optional)
            </label>
            <input
              id="invite-valid"
              type="date"
              value={inviteValidUntil}
              onChange={(event) => setInviteValidUntil(event.target.value)}
              disabled={invitePlan !== "pro"}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Wird versendet …" : "Einladung senden"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionTitle hint="Jeder Zugang hat einen eigenen Datenstand. Deaktivieren oder ein abgelaufener Plan sperrt den Zugriff sofort; Löschen entfernt Konto und Datenstand endgültig.">
          Zugänge
        </SectionTitle>
        {users == null ? (
          <p className="text-sm text-muted">Lade Nutzerliste …</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Zugänge vorhanden.</p>
        ) : (
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full border-collapse text-sm min-w-max">
              <thead>
                <tr className="bg-card-soft">
                  <th className={headerCell}>E-Mail</th>
                  <th className={headerCell}>Anzeigename</th>
                  <th className={headerCell}>Rolle</th>
                  <th className={headerCell}>Plan</th>
                  <th className={headerCell}>Gültig bis</th>
                  <th className={headerCell}>Status</th>
                  <th className={headerCell}>Letzte Anmeldung</th>
                  <th className={headerCell}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === selfId;
                  return (
                    <tr key={user.id} className="border-t border-line">
                      <td className={`${bodyCell} text-ink`}>
                        {user.email}
                        {isSelf ? (
                          <span className="ml-2 text-xs text-muted">(ich)</span>
                        ) : null}
                      </td>
                      <td className={`${bodyCell} text-muted`}>
                        {user.displayName?.trim() || "–"}
                      </td>
                      <td className={bodyCell}>
                        <select
                          aria-label={`Rolle von ${user.email}`}
                          value={user.role}
                          disabled={isSelf}
                          onChange={(event) =>
                            void patchUser({
                              id: user.id,
                              action: "setRole",
                              role: event.target.value,
                            })
                          }
                          className="bg-card border border-line rounded-md px-2 py-1 text-sm text-ink disabled:opacity-60"
                        >
                          <option value="member">{ROLE_LABEL.member}</option>
                          <option value="admin">{ROLE_LABEL.admin}</option>
                        </select>
                      </td>
                      <td className={bodyCell}>{PLAN_LABEL[user.plan]}</td>
                      <td className={`${bodyCell} text-muted whitespace-nowrap`}>
                        {user.plan === "pro"
                          ? user.planValidUntil
                            ? fmtDateTime(user.planValidUntil).slice(0, 10)
                            : "unbegrenzt"
                          : "–"}
                      </td>
                      <td className={bodyCell}>
                        <span className={user.active ? "text-sage" : "text-brick"}>
                          {user.active ? "aktiv" : "deaktiviert"}
                        </span>
                      </td>
                      <td className={`${bodyCell} text-muted whitespace-nowrap`}>
                        {user.lastSignInAt
                          ? fmtDateTime(user.lastSignInAt)
                          : "noch nie"}
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPlanTarget(user);
                              setPlanValue(user.plan === "none" ? "internal" : user.plan);
                              setPlanValidUntil(toDateInput(user.planValidUntil));
                            }}
                            className="px-2 py-1 rounded-md text-muted hover:text-ink hover:bg-card-soft"
                          >
                            Plan ändern
                          </button>
                          <button
                            type="button"
                            disabled={isSelf && user.active}
                            onClick={() =>
                              void patchUser({
                                id: user.id,
                                action: user.active ? "deactivate" : "activate",
                              })
                            }
                            className="px-2 py-1 rounded-md text-muted hover:text-ink hover:bg-card-soft disabled:opacity-40"
                          >
                            {user.active ? "Deaktivieren" : "Aktivieren"}
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(user)}
                            className="px-2 py-1 rounded-md text-brick hover:bg-brick-soft disabled:opacity-40"
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {planTarget ? (
        <Card>
          <SectionTitle hint="„Intern“ gilt unbegrenzt. „Pro“ optional mit Gültigkeitsdatum; danach greift automatisch „Kein Zugang“. Später schreibt das Payment dieselben Felder.">
            {`Plan für ${planTarget.email}`}
          </SectionTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <label htmlFor="plan-value" className="block text-sm text-ink mb-1.5">
                Plan
              </label>
              <select
                id="plan-value"
                value={planValue}
                onChange={(event) => setPlanValue(event.target.value as Plan)}
                className={inputClass}
              >
                <option value="internal">Intern</option>
                <option value="pro">Pro</option>
                <option value="none">kein Plan</option>
              </select>
            </div>
            <div className="w-48">
              <label htmlFor="plan-valid" className="block text-sm text-ink mb-1.5">
                Gültig bis (optional)
              </label>
              <input
                id="plan-valid"
                type="date"
                value={planValidUntil}
                onChange={(event) => setPlanValidUntil(event.target.value)}
                disabled={planValue !== "pro"}
                className={inputClass}
              />
            </div>
            <Button
              variant="primary"
              onClick={async () => {
                const ok = await patchUser({
                  id: planTarget.id,
                  action: "setPlan",
                  plan: planValue,
                  planValidUntil:
                    planValue === "pro" ? fromDateInput(planValidUntil) : null,
                });
                if (ok) {
                  setMessage({
                    kind: "success",
                    text: `Plan für ${planTarget.email} gespeichert.`,
                  });
                  setPlanTarget(null);
                }
              }}
            >
              Speichern
            </Button>
            <Button variant="ghost" onClick={() => setPlanTarget(null)}>
              Abbrechen
            </Button>
          </div>
        </Card>
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Zugang löschen"
        message={`Das Konto ${deleteTarget?.email ?? ""} und der zugehörige Datenstand werden endgültig entfernt. Vorher bei Bedarf dort als JSON exportieren.`}
        confirmLabel="Endgültig löschen"
        onConfirm={() => {
          if (deleteTarget) void removeUser(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
