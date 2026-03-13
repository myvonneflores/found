import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";

const privacySections = [
  {
    title: "What We Collect",
    body: "FOUND may collect information you choose to share with us through contact forms, business recommendations, or direct outreach. We may also collect basic technical and analytics information needed to run, improve, and protect the site.",
  },
  {
    title: "How We Use It",
    body: "We use submitted information to respond to inquiries, review suggested businesses, improve the directory, and understand how the site is being used. We do not sell personal information submitted through FOUND.",
  },
  {
    title: "Third-Party Tools",
    body: "FOUND may rely on trusted third-party providers for hosting, analytics, form handling, and related infrastructure. Those services may process information according to their own privacy policies.",
  },
  {
    title: "Questions or Requests",
    body: "If you have questions about this policy, or would like us to review or delete information you previously shared, please contact us through the Contact page.",
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <main className="page-shell directory-page-shell about-page-shell legal-page-shell">
      <BodyClass className="about-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/privacy-policy" />
        <section className="legal-layout">
          <article className="about-intro-card">
            <div className="about-hero">
              <h1 className="about-title">Privacy Policy</h1>
              <p className="about-tagline">How FOUND handles information shared through this site.</p>
              <p className="legal-intro">
                This page is a simple overview of how FOUND collects, uses, and protects information. A fuller policy
                can be added here later as the product evolves.
              </p>
            </div>
          </article>

          <div className="legal-grid">
            {privacySections.map((section) => (
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
