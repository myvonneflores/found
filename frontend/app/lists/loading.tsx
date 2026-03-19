import { SiteHeader } from "@/components/site-header";

export default function ListsLoading() {
  return (
    <main className="page-shell directory-page-shell public-list-directory-page-shell">
      <div className="directory-shell">
        <SiteHeader resetKey="/lists" />

        <section className="dashboard-stage public-list-directory-stage">
          <article className="panel dashboard-banner public-list-directory-hero">
            <div className="public-list-directory-hero-copy">
              <div className="skeleton skeleton-title" style={{ width: "60%" }} />
              <div className="skeleton skeleton-text" style={{ width: "80%" }} />
            </div>
          </article>

          <section className="public-list-directory-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <article className="panel public-list-directory-card" key={i}>
                <div className="skeleton skeleton-text" style={{ width: "40%" }} />
                <div className="skeleton skeleton-title" style={{ width: "70%", marginTop: "0.5rem" }} />
                <div className="skeleton skeleton-text" style={{ width: "50%" }} />
              </article>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}
