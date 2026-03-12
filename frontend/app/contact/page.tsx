import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="page-shell directory-page-shell">
      <div className="directory-shell">
        <div className="directory-brand-strip">Found</div>
        <section className="directory-panel directory-panel-detail">
          <div className="detail-stack">
            <h1 className="section-title">Contact Us</h1>
            <p className="lede">
              Contact details are still being finalized. This page is a placeholder so the global menu has a stable
              destination while the product evolves.
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
