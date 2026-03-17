import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";

const termsSections = [
  {
    title: "Using FOUND",
    body: "FOUND is an informational directory designed to help people discover and support value-aligned businesses. When you use the site you agree to keep interactions positive, respect ownership signals, and not attempt to disrupt or reverse-engineer the service.",
  },
  {
    title: "Public Profiles & Lists",
    body: "Business owners and list curators control whether their profile or lists are public or private. If you toggle content to public, it becomes visible to everyone; if you keep it private it stays tied to your account and cannot be found through search.",
  },
  {
    title: "Directory Accuracy",
    body: "We work to keep listings thoughtful and current, but business details, ownership, and availability may change. FOUND does not guarantee every entry is complete or error-free. You are responsible for keeping your own profile and lists accurate.",
  },
  {
    title: "Business Account Certification",
    body: "If you create or use a business account on FOUND, you certify that the business you represent is locally owned. You are responsible for making sure that certification is truthful and current before claiming a listing, adding a new business, or using owner tools.",
  },
  {
    title: "External Links",
    body: "Some listings link out to third-party websites or social profiles. FOUND is not responsible for those external services, their content, availability, or policies.",
  },
  {
    title: "Updates",
    body: "These terms evolve as FOUND grows. Continued use of the site after changes are posted means you accept the revised terms.",
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
                the platform expands, including the commitments business account users make when certifying local
                ownership.
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
