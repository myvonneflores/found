import { SiteHeader } from "@/components/site-header";

export default function CompanyDetailLoading() {
  return (
    <main className="page-shell detail-stack detail-page-shell">
      <SiteHeader />

      <section className="detail-card detail-header">
        <div className="detail-header-top">
          <div className="detail-header-copy">
            <div className="skeleton skeleton-title" style={{ width: "50%" }} />
            <div className="skeleton skeleton-text" style={{ width: "30%" }} />
          </div>
        </div>
        <div className="filter-chip-row detail-chip-row">
          <span className="skeleton skeleton-badge" />
          <span className="skeleton skeleton-badge" />
          <span className="skeleton skeleton-badge" />
        </div>
        <div className="skeleton-paragraph" style={{ marginTop: "0.5rem" }}>
          <span className="skeleton skeleton-text" style={{ width: "90%" }} />
          <span className="skeleton skeleton-text" style={{ width: "60%" }} />
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-card detail-map-card">
          <span className="field-label skeleton skeleton-text" style={{ width: "80px" }} />
          <div className="skeleton skeleton-map" />
        </article>
        <article className="detail-card detail-hours-card">
          <span className="field-label skeleton skeleton-text" style={{ width: "120px" }} />
          {Array.from({ length: 7 }, (_, i) => (
            <div className="skeleton skeleton-row" key={i} style={{ height: "1.6rem" }} />
          ))}
        </article>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <span className="field-label skeleton skeleton-text" style={{ width: "140px" }} />
          <div className="filter-chip-row">
            <span className="skeleton skeleton-badge" />
            <span className="skeleton skeleton-badge" />
          </div>
        </article>
        <article className="detail-card">
          <span className="field-label skeleton skeleton-text" style={{ width: "160px" }} />
          <div className="filter-chip-row">
            <span className="skeleton skeleton-badge" />
            <span className="skeleton skeleton-badge" />
          </div>
        </article>
      </section>
    </main>
  );
}
