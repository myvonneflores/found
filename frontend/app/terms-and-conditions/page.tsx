import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";

export default function TermsAndConditionsPage() {
  return (
    <main className="page-shell directory-page-shell about-page-shell legal-page-shell">
      <BodyClass className="about-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/terms-and-conditions" />
        <section className="legal-layout">
          <article className="about-intro-card">
            <div className="about-hero">
              <h1 className="about-title">Terms &amp; Conditions</h1>
              <p className="about-tagline">Basic terms for using the FOUND directory and website.</p>
            </div>
          </article>

          <article className="about-card legal-card">
            <h2>Use of the Site</h2>
            <p className="lede">
              FOUND is provided as an informational directory to help people discover locally owned businesses. By
              using the site, you agree not to misuse the content, interfere with the service, or attempt to access
              systems beyond normal public use.
            </p>

            <h2>Directory Information</h2>
            <p className="lede">
              We aim to keep listings accurate and useful, but business details may change over time. FOUND does not
              guarantee that every listing is complete, current, or free from error.
            </p>

            <h2>Links to Other Sites</h2>
            <p className="lede">
              Some pages may link to third-party websites or social profiles. FOUND is not responsible for the content,
              availability, or policies of those third-party services.
            </p>

            <h2>Changes</h2>
            <p className="lede">
              We may update these terms as the site evolves. Continued use of FOUND after changes are posted means you
              accept the updated terms.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
