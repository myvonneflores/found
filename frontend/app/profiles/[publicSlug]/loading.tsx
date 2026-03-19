import { SiteHeader } from "@/components/site-header";

export default function ProfileLoading() {
  return (
    <main className="page-shell directory-page-shell auth-page-shell public-profile-page-shell dashboard-page-shell">
      <div className="directory-shell">
        <SiteHeader />

        <section className="dashboard-stage">
          <article className="panel dashboard-banner">
            <div className="skeleton skeleton-title" style={{ width: "40%" }} />
            <div className="skeleton skeleton-text" style={{ width: "60%" }} />
          </article>

          <section className="dashboard-board">
            {Array.from({ length: 3 }, (_, i) => (
              <article className="panel dashboard-panel" key={i}>
                <div className="skeleton skeleton-row" />
                <div className="skeleton skeleton-row" />
              </article>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}
