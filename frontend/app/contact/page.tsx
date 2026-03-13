import { BodyClass } from "@/components/body-class";
import { ContactForm } from "@/components/contact-form";
import { SiteHeader } from "@/components/site-header";

export default function ContactPage() {
  return (
    <main className="page-shell directory-page-shell contact-page-shell">
      <BodyClass className="contact-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/contact" />

        <section className="contact-stage">
          <div className="contact-grid">
              <article className="contact-card contact-card-feature">
              <div className="contact-feature-header">
                <div className="contact-feature-copy">
                  <h1 className="contact-feature-title">Contact Us</h1>
                  <p className="contact-feature-lede">
                    Know a great local business we should feature? Found something that could work better? We&apos;d
                    love your feedback. Send us a note and we&apos;ll be in touch soon.
                  </p>
                </div>
              </div>

              <ContactForm />
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
