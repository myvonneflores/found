import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="badge">Public company directory</span>
        <h1>Discover businesses worth seeking out.</h1>
        <p>
          Found highlights retail, food, and wellness companies through a searchable
          directory built for discovery, relevance, and clean search visibility.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/companies">
            Browse companies
          </Link>
        </div>
      </section>
    </main>
  );
}
