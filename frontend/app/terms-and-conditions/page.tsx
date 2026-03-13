import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";

const termsSections = [
  {
    title: "Using FOUND",
    body: "FOUND is an informational directory designed to help people discover value-aligned businesses. By using the site, you agree not to misuse the content, interfere with the service, or attempt to access parts of the platform beyond normal public use.",
  },
  {
    title: "Directory Accuracy",
    body: "We work to keep listings thoughtful, useful, and current, but business details can change over time. FOUND does not guarantee that every listing is complete, error-free, or fully up to date at every moment.",
  },
  {
    title: "External Links",
    body: "Some listings and pages link to third-party websites or social profiles. FOUND is not responsible for the content, availability, or policies of those external services.",
  },
  {
    title: "Updates",
    body: "These terms may evolve as FOUND grows. Continued use of the site after updates are published means you accept the revised terms.",
  },
] as const;

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
              <p className="legal-intro">
                This page covers the basics for using FOUND today. It can grow into a more formal legal document as
                the platform expands.
              </p>
            </div>
          </article>

          <div className="legal-grid">
            {termsSections.map((section) => (
              <article className="about-card legal-card" key={section.title}>
                <h2>{section.title}</h2>
                <p className="lede">{section.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
