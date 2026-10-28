import type { CompanySettings, ReportSettings } from "@/lib/profile/settings";

/**
 * Kopf des gebrandeten Reports: Logo, Firmenname und Adresse aus dem Profil,
 * Titel und Untertitel. Fehlende Felder werden nicht gerendert. Wiederverwendbar
 * für die Standortanalyse (spätere Phase).
 */
export function ReportHeader({
  company,
  report,
  title,
  subtitle,
  lines = [],
}: {
  company: CompanySettings;
  report: ReportSettings;
  title: string;
  /** z. B. "Objektsteckbrief · Wirtschaftlichkeitsanalyse" */
  subtitle: string;
  /** Weitere Zeilen unter dem Titel (Adresse, Link), leere werden ausgelassen. */
  lines?: (string | null | undefined)[];
}) {
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const addressLine = [
    company.street,
    [company.zip, company.city].filter(Boolean).join(" "),
    company.country,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  const showCompany = Boolean(company.name || addressLine);
  const showLogo = report.showLogo && Boolean(company.logoDataUrl);

  return (
    <header className="report-header">
      {showLogo || showCompany ? (
        <div className="report-brand">
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoDataUrl!} alt={company.name || "Logo"} className="report-logo" />
          ) : null}
          {showCompany ? (
            <div className="report-company">
              {company.name ? <div className="report-company-name">{company.name}</div> : null}
              {addressLine ? <div className="report-muted">{addressLine}</div> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <h1>{title}</h1>
      <p className="report-sub">
        {subtitle}
        {report.showDate ? ` · Stand ${today}` : ""}
      </p>
      {lines
        .filter((line): line is string => Boolean(line && line.trim()))
        .map((line, index) => (
          <p key={index} className={index === 0 ? undefined : "report-muted"}>
            {line}
          </p>
        ))}
    </header>
  );
}
