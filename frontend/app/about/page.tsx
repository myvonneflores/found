import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="page-shell directory-page-shell">
      <div className="directory-shell">
        <div className="directory-brand-strip">Found</div>
        <section className="directory-panel directory-panel-detail">
          <div className="detail-stack">
            <h1 className="section-title">About Us</h1>
            <p className="lede">
              Found is building a more thoughtful way to browse small businesses. This page is a placeholder while the
              directory experience takes shape.
            </p>
            <p className="lede">
              For now, the best way to experience Found is through the directory itself.
            </p>
            <div>
              <Link className="button button-secondary" href="/companies">
                Back to Search
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
