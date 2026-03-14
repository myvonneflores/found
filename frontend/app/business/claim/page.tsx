"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import { createBusinessClaim, listBusinessClaims } from "@/lib/api";
import { BusinessClaim } from "@/types/auth";

export default function BusinessClaimPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, user } = useAuth();
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    businessEmail: user?.email ?? "",
    businessPhone: "",
    website: "",
    instagramHandle: "",
    facebookPage: "",
    linkedinPage: "",
    roleTitle: "",
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
    if (!user?.email) {
      return;
    }
    setForm((current) => ({ ...current, businessEmail: current.businessEmail || user.email }));
  }, [user?.email]);

  useEffect(() => {
    async function loadClaims() {
      if (!accessToken || !user || user.account_type !== "business") {
        setIsLoadingClaims(false);
        return;
      }

      try {
        const nextClaims = await listBusinessClaims(accessToken);
        setClaims(nextClaims);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load your business claims.");
      } finally {
        setIsLoadingClaims(false);
      }
    }

    void loadClaims();
  }, [accessToken, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError("Please log in again before submitting your claim.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const claim = await createBusinessClaim(accessToken, {
        business_name: form.businessName,
        business_email: form.businessEmail,
        business_phone: form.businessPhone,
        website: form.website,
        instagram_handle: form.instagramHandle,
        facebook_page: form.facebookPage,
        linkedin_page: form.linkedinPage,
        role_title: form.roleTitle,
        claim_message: form.claimMessage,
      });

      setClaims((current) => [claim, ...current]);
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
    <main className="page-shell directory-page-shell auth-page-shell">
      <BodyClass className="auth-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/business/claim" />

        <section className="dashboard-stage">
          <article className="auth-card dashboard-hero-card">
            <div className="auth-kicker">Business verification</div>
            <h1 className="auth-title">Claim your FOUND presence.</h1>
            <p className="lede">
              Tell us who you are, how to verify the business, and how you want to contribute to the community. Once
              approved, you’ll unlock business editing and community tools.
            </p>
          </article>

          <article className="auth-card auth-form-card">
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
                  <span className="contact-field-label">Business email</span>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, businessEmail: event.target.value }))}
                    required
                    type="email"
                    value={form.businessEmail}
                  />
                </label>

                <label className="contact-field">
                  <span className="contact-field-label">Role title</span>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, roleTitle: event.target.value }))}
                    placeholder="Owner, founder, manager"
                    value={form.roleTitle}
                  />
                </label>
              </div>

              <div className="auth-form-grid">
                <label className="contact-field">
                  <span className="contact-field-label">Website</span>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                    placeholder="https://"
                    value={form.website}
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

              <div className="auth-form-grid">
                <label className="contact-field">
                  <span className="contact-field-label">Instagram</span>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, instagramHandle: event.target.value }))}
                    placeholder="handle"
                    value={form.instagramHandle}
                  />
                </label>

                <label className="contact-field">
                  <span className="contact-field-label">Facebook page</span>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, facebookPage: event.target.value }))}
                    placeholder="https://facebook.com/yourpage"
                    value={form.facebookPage}
                  />
                </label>
              </div>

              <label className="contact-field">
                <span className="contact-field-label">LinkedIn page</span>
                <input
                  onChange={(event) => setForm((current) => ({ ...current, linkedinPage: event.target.value }))}
                  placeholder="https://linkedin.com/company/yourcompany"
                  value={form.linkedinPage}
                />
              </label>

              <label className="contact-field">
                <span className="contact-field-label">Claim message</span>
                <textarea
                  onChange={(event) => setForm((current) => ({ ...current, claimMessage: event.target.value }))}
                  placeholder="Tell us how you're connected to the business and what you'd like to manage."
                  rows={6}
                  value={form.claimMessage}
                />
              </label>

              {error ? <p className="contact-form-note is-error">{error}</p> : null}

              <div className="auth-form-actions">
                <button className="contact-submit" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Submitting..." : "Submit claim"}
                </button>
                <Link className="auth-text-link" href="/business/pending">
                  View verification status
                </Link>
              </div>
            </form>
          </article>

          <article className="auth-card dashboard-card">
            <h2>Recent submissions</h2>
            {isLoadingClaims ? <p className="lede">Loading your existing claims...</p> : null}
            {!isLoadingClaims && claims.length === 0 ? (
              <p className="lede">No claims submitted yet. Once you send one in, it will show up here.</p>
            ) : null}
            {!isLoadingClaims && claims.length > 0 ? (
              <div className="auth-status-list">
                {claims.map((claim) => (
                  <div className="auth-status-item" key={claim.id}>
                    <div>
                      <strong>{claim.business_name}</strong>
                      <p>{claim.business_email}</p>
                    </div>
                    <span className={`badge ${claim.status === "verified" ? "" : "badge-outline"}`}>{claim.status}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </section>
      </div>
    </main>
  );
}
