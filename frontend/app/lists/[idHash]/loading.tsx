import { SiteHeader } from "@/components/site-header";

export default function ListDetailLoading() {
  return (
    <main className="page-shell directory-page-shell public-list-page-shell">
      <div className="directory-shell">
        <SiteHeader />

        <section className="public-list-stage list-browser-stage">
          <div className="company-card public-list-hero-card">
            <div className="skeleton skeleton-text" style={{ width: "40%" }} />
          </div>

          <section className="list-browser-frame">
            <div className="list-browser-layout">
              <aside className="list-browser-sidebar">
                <div className="list-browser-sidebar-copy">
                  <div className="skeleton skeleton-title" />
                  <div className="skeleton skeleton-text" style={{ width: "80%" }} />
                </div>
                <div className="list-browser-company-list">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div className="skeleton skeleton-row" key={i} />
                  ))}
                </div>
              </aside>

              <section className="list-browser-detail-panel">
                <div className="directory-panel-surface list-browser-detail-surface">
                  <div className="skeleton skeleton-title" />
                  <div className="skeleton skeleton-text" style={{ width: "50%" }} />
                  <div className="skeleton skeleton-map" style={{ marginTop: "1rem" }} />
                </div>
              </section>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
