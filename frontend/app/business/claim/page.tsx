"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import { createBusinessClaim } from "@/lib/api";

export default function BusinessClaimPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    firstName: "",
    lastName: "",
    businessEmail: user?.email ?? "",
    businessPhone: "",
    businessDomain: "",
    jobTitle: "",
    claimMessage: "",
  });

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (user?.account_type !== "business") {
      router.replace("/account");
      return;
    }

    if (user.is_business_verified) {
      router.replace("/business/dashboard");
      return;
    }
  }, [isAuthenticated, isReady, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm((current) => ({
      ...current,
      firstName: current.firstName || user.first_name || "",
      lastName: current.lastName || user.last_name || "",
      businessName: current.businessName || user.display_name || "",
      businessEmail: current.businessEmail || user.email || "",
    }));
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError("Please log in again before submitting your claim.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const trimmedClaimMessage = form.claimMessage.trim();
      const composedClaimMessage = [
        `First name: ${form.firstName.trim()}`,
        `Last name: ${form.lastName.trim()}`,
        `Business domain: ${form.businessDomain.trim()}`,
        trimmedClaimMessage ? `Claim message: ${trimmedClaimMessage}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const claim = await createBusinessClaim(accessToken, {
        business_name: form.businessName,
        business_email: form.businessEmail,
        business_phone: form.businessPhone,
        website: form.businessDomain,
        role_title: form.jobTitle,
        claim_message: composedClaimMessage,
      });

      router.push("/business/pending");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your business claim.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady || !user || user.account_type !== "business") {
    return null;
  }

  return (
    <main className="page-shell directory-page-shell home-page-shell business-claim-page-shell">
      <BodyClass className="home-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/business/claim" />

        <section className="auth-stage business-claim-stage">
          <article className="auth-card home-hero-card home-hero-copy business-claim-copy">
            <h1 className="auth-title">Claim your business.</h1>
            <p className="home-hero-lede">
              Claim an existing FOUND listing or start a brand-new company profile. Once your claim is approved,
              you&apos;ll unlock business editing and community tools.
            </p>

            <div className="business-claim-points">
              <div className="business-claim-point">
                <strong>Step one</strong>
                <p>Sign up with an email containing your company domain.</p>
              </div>
              <div className="business-claim-point">
                <strong>Step two</strong>
                <p>Submit your claim and we&apos;ll review it manually.</p>
              </div>
              <div className="business-claim-point">
                <strong>Step three</strong>
                <p>Build favorites and private lists while we review. Public sharing unlocks after verification.</p>
              </div>
            </div>
          </article>

          <div className="business-claim-side">
            <article className="auth-card home-section-card home-section-cream business-claim-form-card">
              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="contact-field">
                  <span className="contact-field-label">Business name</span>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))}
                    required
                    value={form.businessName}
                  />
                </label>

                <div className="auth-form-grid">
                  <label className="contact-field">
                    <span className="contact-field-label">First name</span>
                    <input
                      onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                      required
                      value={form.firstName}
                    />
                  </label>

                  <label className="contact-field">
                    <span className="contact-field-label">Last name</span>
                    <input
                      onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                      required
                      value={form.lastName}
                    />
                  </label>
                </div>

                <div className="auth-form-grid">
                  <label className="contact-field">
                    <span className="contact-field-label">Job title</span>
                    <input
                      onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))}
                      placeholder="Owner, founder, manager"
                      value={form.jobTitle}
                    />
                  </label>

                  <label className="contact-field">
                    <span className="contact-field-label">Phone</span>
                    <input
                      onChange={(event) => setForm((current) => ({ ...current, businessPhone: event.target.value }))}
                      value={form.businessPhone}
                    />
                  </label>
                </div>

                <label className="contact-field">
                  <span className="contact-field-label">Business domain</span>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, businessDomain: event.target.value }))}
                    placeholder="yourbusiness.com"
                    required
                    value={form.businessDomain}
                  />
                </label>

                <label className="contact-field">
                  <span className="contact-field-label">Business email</span>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, businessEmail: event.target.value }))}
                    placeholder="info@domain.com"
                    required
                    type="email"
                    value={form.businessEmail}
                  />
                </label>

                <label className="contact-field">
                  <span className="contact-field-label">Claim message</span>
                  <textarea
                    onChange={(event) => setForm((current) => ({ ...current, claimMessage: event.target.value }))}
                    placeholder="Tell us how you're connected to the business and what you'd like to manage."
                    rows={5}
                    value={form.claimMessage}
                  />
                </label>

                {error ? <p className="contact-form-note is-error">{error}</p> : null}

                <div className="auth-form-actions">
                  <button className="contact-submit" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Submitting..." : "Submit claim"}
                  </button>
                </div>
              </form>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
