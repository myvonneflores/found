import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";

const privacySections = [
  {
    title: "What We Collect",
    body: "We store only the information you provide—name, email, business details, and optional public lists or favorites. Technical data like browser info and cookies helps us keep the site secure and orderly.",
  },
  {
    title: "Public vs. Private Content",
    body: "You choose whether your business profile, curated lists, and favorites stay public or private. Private content remains tied to your account and is not searchable by other users unless you toggle the visibility on.",
  },
  {
    title: "How We Use It",
    body: "We use submitted content to power the directory, surface recommendations, share updates, and respond to support requests. We never sell personal data gathered through FOUND, and we delete what you ask us to remove.",
  },
  {
    title: "Third-Party Tools",
    body: "FOUND relies on trusted hosting, analytics, and email partners. Those services process data under their own policies, so please review them if you have a question about how the data is handled downstream.",
  },
  {
    title: "Questions or Requests",
    body: "Contact us through the Contact page if you need help reviewing, correcting, or deleting data associated with your account.",
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
                This page summarizes the kinds of information we collect, how we use it, and how you can manage your
                privacy choices as the product grows.
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
