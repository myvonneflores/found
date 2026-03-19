import { SiteHeader } from "@/components/site-header";

export default function HomeLoading() {
  return (
    <main className="page-shell directory-page-shell home-page-shell">
      <div className="directory-shell">
        <SiteHeader resetKey="/" />

        <section className="home-hero-grid">
          <article className="home-hero-card home-hero-copy">
            <div className="home-hero-layout">
              <div className="home-hero-text">
                <div className="skeleton skeleton-title" style={{ width: "80%" }} />
                <div className="skeleton-paragraph">
                  <span className="skeleton skeleton-text" style={{ width: "95%" }} />
                  <span className="skeleton skeleton-text" style={{ width: "80%" }} />
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="home-section home-section-rose">
          <article className="home-section-card">
            <div className="home-section-heading">
              <div className="skeleton skeleton-title" style={{ width: "50%" }} />
              <div className="skeleton skeleton-text" style={{ width: "70%" }} />
            </div>
            <div className="home-featured-grid">
              {Array.from({ length: 4 }, (_, i) => (
                <div className="home-feature-card skeleton skeleton-card" key={i} />
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
