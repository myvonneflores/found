import { SiteHeader } from "@/components/site-header";

export default function CompaniesLoading() {
  return (
    <main className="page-shell directory-page-shell">
      <div className="directory-shell">
        <SiteHeader resetKey="/companies" />

        <div className="directory-layout">
          <aside className="directory-panel directory-filter-panel">
            <div className="skeleton skeleton-input" />
            <div className="skeleton skeleton-input" />
            <div className="skeleton skeleton-input" />
            <div className="skeleton skeleton-input" />
          </aside>

          <section className="directory-panel directory-list-panel">
            {Array.from({ length: 8 }, (_, i) => (
              <div className="skeleton skeleton-row" key={i} />
            ))}
          </section>

          <section className="directory-panel directory-detail-panel">
            <div className="directory-panel-surface">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" style={{ width: "40%" }} />
              <div className="skeleton skeleton-map" style={{ marginTop: "1rem" }} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
