import { SiteHeader } from "@/components/site-header";

export default function CompaniesLoading() {
  return (
    <main className="page-shell directory-page-shell">
      <div className="directory-shell">
        <SiteHeader resetKey="/companies" />

        <div className="directory-grid">
          <aside className="directory-panel directory-panel-filters">
            <div className="directory-panel-mobile-title">filters</div>
            <div className="directory-panel-surface">
              <div className="directory-form" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i}>
                    <div className="skeleton skeleton-text" style={{ width: "38%", marginBottom: "0.85rem" }} />
                    <div className="skeleton skeleton-input" style={{ marginBottom: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="directory-panel directory-panel-list">
            <div className="directory-panel-mobile-title">finds</div>
            <div className="directory-panel-surface">
              <div className="directory-company-list" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <div className="skeleton skeleton-row" key={i} />
                ))}
              </div>
            </div>
          </section>

          <section className="directory-panel directory-panel-detail">
            <div className="directory-panel-mobile-title">find</div>
            <div className="directory-panel-surface">
              <div className="directory-detail-body" aria-hidden="true">
                <div className="directory-detail-header-grid">
                  <div className="skeleton skeleton-title" style={{ width: "52%", marginBottom: "0.4rem" }} />
                  <div className="skeleton skeleton-text" style={{ width: "36%" }} />
                </div>
                <div className="directory-detail-layout">
                  <div className="directory-detail-copy">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div className="skeleton skeleton-text" key={i} style={{ width: i === 2 ? "74%" : "88%" }} />
                    ))}
                  </div>
                  <div className="directory-detail-media">
                    <div className="skeleton skeleton-map" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
