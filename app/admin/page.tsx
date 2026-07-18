"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SessionRole } from "@/lib/session";
import { fmtDateTime } from "@/lib/format";
import { Button, Card, ConfirmDialog, Notice, SectionTitle } from "@/components/ui";

interface AdminUser {
  id: string;
  username: string;
  role: SessionRole;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

const inputClass =
  "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-taupe";

const headerCell =
  "px-3 py-2 text-left text-[11px] uppercase tracking-[0.08em] text-muted font-normal whitespace-nowrap";
const bodyCell = "px-3 py-2 align-middle";

/**
 * Interne Nutzerverwaltung (nur Rolle "admin").
 * Anlegen mit Startpasswort, aktivieren/deaktivieren, Passwort zurücksetzen,
 * löschen (entfernt auch den Datenstand des Nutzers).
 */
export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<SessionRole>("member");
  const [pending, setPending] = useState(false);

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        setForbidden(true);
        return;
      }
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

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        user?: AdminUser;
      } | null;
      if (!response.ok || !body?.ok) {
        setMessage({
          kind: "error",
          text: body?.error ?? "Anlegen fehlgeschlagen.",
        });
      } else {
        setMessage({
          kind: "success",
          text: `Nutzer "${body.user?.username}" angelegt. Startpasswort sicher übermitteln, es wird nirgends erneut angezeigt.`,
        });
        setNewUsername("");
        setNewPassword("");
        setNewRole("member");
        await loadUsers();
      }
    } catch {
      setMessage({ kind: "error", text: "Anlegen fehlgeschlagen." });
    } finally {
      setPending(false);
    }
  };

  const patchUser = async (payload: Record<string, string>) => {
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
        setMessage({ kind: "success", text: "Nutzer und Datenstand entfernt." });
        await loadUsers();
      }
    } catch {
      setMessage({ kind: "error", text: "Löschen fehlgeschlagen." });
    }
  };

  if (forbidden) {
    return (
      <div className="py-8">
        <Card className="text-center py-14">
          <p className="font-display text-lg tracking-wide uppercase text-ink">
            Nur für Administratoren
          </p>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
            Dieser Bereich verwaltet die Zugänge. Bei Bedarf an den
            Administrator wenden.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <h1 className="font-display text-2xl tracking-wide uppercase text-ink">
        Verwaltung
      </h1>

      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      <Card>
        <SectionTitle hint='Der Master-Zugang (Benutzername "admin" mit dem SITE_PASSWORD aus Vercel) funktioniert immer und erscheint nicht in dieser Liste.'>
          Neuen Zugang anlegen
        </SectionTitle>
        <form
          onSubmit={createUser}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label htmlFor="new-username" className="block text-sm text-ink mb-1.5">
              Benutzername
            </label>
            <input
              id="new-username"
              type="text"
              autoCapitalize="none"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              placeholder="z. B. anna"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm text-ink mb-1.5">
              Startpasswort (min. 8 Zeichen)
            </label>
            <input
              id="new-password"
              type="text"
              autoComplete="off"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new-role" className="block text-sm text-ink mb-1.5">
              Rolle
            </label>
            <select
              id="new-role"
              value={newRole}
              onChange={(event) =>
                setNewRole(event.target.value === "admin" ? "admin" : "member")
              }
              className={inputClass}
            >
              <option value="member">Mitglied</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Wird angelegt …" : "Zugang anlegen"}
          </Button>
        </form>
      </Card>

      <Card>
        <SectionTitle hint="Jeder Zugang hat einen eigenen Datenstand. Deaktivieren sperrt den Datenzugriff sofort; Löschen entfernt Zugang und Datenstand endgültig.">
          Zugänge
        </SectionTitle>
        {users == null ? (
          <p className="text-sm text-muted">Lade Nutzerliste …</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted">
            Noch keine Zugänge angelegt. Der Master-Zugang funktioniert
            unabhängig davon.
          </p>
        ) : (
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full border-collapse text-sm min-w-max">
              <thead>
                <tr className="bg-card-soft">
                  <th className={headerCell}>Benutzername</th>
                  <th className={headerCell}>Rolle</th>
                  <th className={headerCell}>Status</th>
                  <th className={headerCell}>Letzte Anmeldung</th>
                  <th className={headerCell}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-line">
                    <td className={`${bodyCell} text-ink`}>{user.username}</td>
                    <td className={bodyCell}>
                      {user.role === "admin" ? "Admin" : "Mitglied"}
                    </td>
                    <td className={bodyCell}>
                      <span
                        className={
                          user.active ? "text-sage" : "text-brick"
                        }
                      >
                        {user.active ? "aktiv" : "deaktiviert"}
                      </span>
                    </td>
                    <td className={`${bodyCell} text-muted whitespace-nowrap`}>
                      {user.last_login_at
                        ? fmtDateTime(user.last_login_at)
                        : "noch nie"}
                    </td>
                    <td className={`${bodyCell} whitespace-nowrap`}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            void patchUser({
                              id: user.id,
                              action: user.active ? "deactivate" : "activate",
                            })
                          }
                          className="px-2 py-1 rounded-md text-muted hover:text-ink hover:bg-card-soft"
                        >
                          {user.active ? "Deaktivieren" : "Aktivieren"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetPassword("");
                            setResetTarget(user);
                          }}
                          className="px-2 py-1 rounded-md text-muted hover:text-ink hover:bg-card-soft"
                        >
                          Passwort zurücksetzen
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(user)}
                          className="px-2 py-1 rounded-md text-brick hover:bg-brick-soft"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {resetTarget ? (
        <Card>
          <SectionTitle>
            {`Neues Passwort für "${resetTarget.username}"`}
          </SectionTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grow max-w-xs">
              <label
                htmlFor="reset-password"
                className="block text-sm text-ink mb-1.5"
              >
                Neues Passwort (min. 8 Zeichen)
              </label>
              <input
                id="reset-password"
                type="text"
                autoComplete="off"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                className={inputClass}
              />
            </div>
            <Button
              variant="primary"
              onClick={async () => {
                const ok = await patchUser({
                  id: resetTarget.id,
                  action: "resetPassword",
                  newPassword: resetPassword,
                });
                if (ok) {
                  setMessage({
                    kind: "success",
                    text: `Passwort für "${resetTarget.username}" zurückgesetzt. Sicher übermitteln.`,
                  });
                  setResetTarget(null);
                }
              }}
            >
              Zurücksetzen
            </Button>
            <Button variant="ghost" onClick={() => setResetTarget(null)}>
              Abbrechen
            </Button>
          </div>
        </Card>
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Zugang löschen"
        message={`Der Zugang "${deleteTarget?.username ?? ""}" und der zugehörige Datenstand werden endgültig entfernt. Vorher bei Bedarf dort als JSON exportieren.`}
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
