import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="panel empty-state">
        <h1 className="section-title">Page not found</h1>
        <p className="lede">The company profile you requested could not be found.</p>
        <Link className="button button-primary" href="/companies">
          Browse companies
        </Link>
      </section>
    </main>
  );
}
