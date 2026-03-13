import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";

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
            </div>
          </article>

          <article className="about-card legal-card">
            <h2>Information We Collect</h2>
            <p className="lede">
              FOUND may collect the information you choose to submit through contact forms, business recommendations,
              or other direct outreach. We may also collect basic analytics and technical information needed to keep
              the site running.
            </p>

            <h2>How We Use Information</h2>
            <p className="lede">
              We use submitted information to respond to inquiries, review suggested businesses, improve the directory,
              and maintain site performance. We do not sell personal information submitted through the site.
            </p>

            <h2>Third-Party Services</h2>
            <p className="lede">
              FOUND may rely on third-party tools for hosting, analytics, and form delivery. Those providers may
              process information according to their own privacy practices.
            </p>

            <h2>Contact</h2>
            <p className="lede">
              If you have questions about this policy or would like us to review or delete information you submitted,
              please reach out through the Contact page.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
