import { RememberedDirectoryLink } from "@/components/remembered-directory-link";

export default function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="panel empty-state">
        <h1 className="section-title">Page not found</h1>
        <p className="lede">The company profile you requested could not be found.</p>
        <RememberedDirectoryLink className="button button-primary">Browse companies</RememberedDirectoryLink>
      </section>
    </main>
  );
}
