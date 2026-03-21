"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useDeferredValue, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { AuthGuardShell } from "@/components/auth-guard-shell";
import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import {
  createBusinessClaim,
  getBusinessClaim,
  listCompanies,
  updateBusinessClaim,
} from "@/lib/api";
import type {
  BusinessClaim,
  BusinessClaimIntent,
  BusinessClaimPayload,
} from "@/types/auth";

const CLAIM_SIGNUP_STORAGE_KEY = "found-signup-claim-company";

type SelectedCompany = {
  id: number;
  name: string;
  slug: string;
};

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function BusinessClaimPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isAuthenticated, isReady, setRedirecting, user } = useAuth();
  const [intent, setIntent] = useState<BusinessClaimIntent>(
    searchParams.get("intent") === "new" ? "new" : "existing"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingClaim, setIsLoadingClaim] = useState(false);
  const [error, setError] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const deferredCompanySearch = useDeferredValue(companySearch);
  const [companyResults, setCompanyResults] = useState<SelectedCompany[]>([]);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<SelectedCompany | null>(null);
  const [editingClaim, setEditingClaim] = useState<BusinessClaim | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    firstName: "",
    lastName: "",
    businessEmail: user?.email ?? "",
    businessPhone: "",
    businessDomain: "",
    instagramHandle: "",
    facebookPage: "",
    linkedinPage: "",
    jobTitle: "",
    claimMessage: "",
  });

  useEffect(() => {
    const nextIntent = searchParams.get("intent") === "new" ? "new" : "existing";
    setIntent(nextIntent);
  }, [searchParams]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      setRedirecting(true);
      router.replace("/login");
      return;
    }

    if (user?.account_type !== "business") {
      setRedirecting(true);
      router.replace("/account");
      return;
    }

    if (user.is_business_verified) {
      setRedirecting(true);
      router.replace("/business/dashboard");
      return;
    }
  }, [isAuthenticated, isReady, router, setRedirecting, user]);

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
    setCompanySearch((current) => current || user.display_name || "");
  }, [user]);

  useEffect(() => {
    if (intent !== "existing" || selectedCompany || editingClaim) {
      return;
    }

    const storedValue = window.sessionStorage.getItem(CLAIM_SIGNUP_STORAGE_KEY);
    if (!storedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as SelectedCompany;
      if (!parsed?.id || !parsed?.name || !parsed?.slug) {
        return;
      }

      setSelectedCompany(parsed);
      setCompanySearch(parsed.name);
      setForm((current) => ({
        ...current,
        businessName: current.businessName || parsed.name,
      }));
    } catch {
      window.sessionStorage.removeItem(CLAIM_SIGNUP_STORAGE_KEY);
    }
  }, [editingClaim, intent, selectedCompany]);

  useEffect(() => {
    async function loadEditableClaim() {
      if (!accessToken) {
        return;
      }

      const claimId = Number(searchParams.get("claim") || "");
      if (!claimId) {
        return;
      }

      setIsLoadingClaim(true);
      try {
        const claim = await getBusinessClaim(accessToken, claimId);

        setEditingClaim(claim);
        setIntent(claim.intent);
        setForm({
          businessName: claim.business_name,
          firstName: claim.submitter_first_name,
          lastName: claim.submitter_last_name,
          businessEmail: claim.business_email,
          businessPhone: claim.business_phone,
          businessDomain: claim.website,
          instagramHandle: claim.instagram_handle,
          facebookPage: claim.facebook_page,
          linkedinPage: claim.linkedin_page,
          jobTitle: claim.role_title,
          claimMessage: claim.claim_message,
        });

        if (claim.company && claim.company_name && claim.company_slug) {
          const company = {
            id: claim.company,
            name: claim.company_name,
            slug: claim.company_slug,
          };
          setSelectedCompany(company);
          setCompanySearch(company.name);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your existing claim."
        );
      } finally {
        setIsLoadingClaim(false);
      }
    }

    void loadEditableClaim();
  }, [accessToken, searchParams]);

  useEffect(() => {
    async function searchCompanies() {
      if (intent !== "existing") {
        setCompanyResults([]);
        return;
      }

      const query = deferredCompanySearch.trim();
      if (query.length < 2) {
        setCompanyResults([]);
        return;
      }

      setIsSearchingCompanies(true);
      try {
        const response = await listCompanies({ search: query });
        setCompanyResults(
          response.results.slice(0, 8).map((company) => ({
            id: company.id,
            name: company.name,
            slug: company.slug,
          }))
        );
      } catch {
        setCompanyResults([]);
      } finally {
        setIsSearchingCompanies(false);
      }
    }

    void searchCompanies();
  }, [deferredCompanySearch, intent]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError("Please log in again before submitting your claim.");
      return;
    }

    if (intent === "existing" && !selectedCompany) {
      setError("Select the FOUND company profile you want to claim.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload: BusinessClaimPayload = {
        company: intent === "existing" ? selectedCompany?.id ?? null : null,
        intent,
        business_name:
          intent === "existing"
            ? selectedCompany?.name ?? form.businessName.trim()
            : form.businessName.trim(),
        submitter_first_name: form.firstName.trim(),
        submitter_last_name: form.lastName.trim(),
        business_email: form.businessEmail.trim(),
        business_phone: form.businessPhone.trim(),
        website: normalizeWebsite(form.businessDomain),
        instagram_handle: form.instagramHandle.trim(),
        facebook_page: form.facebookPage.trim(),
        linkedin_page: form.linkedinPage.trim(),
        role_title: form.jobTitle.trim(),
        claim_message: form.claimMessage.trim(),
      };

      if (editingClaim) {
        await updateBusinessClaim(accessToken, editingClaim.id, payload);
      } else {
        await createBusinessClaim(accessToken, payload);
      }

      window.sessionStorage.removeItem(CLAIM_SIGNUP_STORAGE_KEY);
      router.push("/business/pending");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your business claim."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady || !user || user.account_type !== "business") {
    return <AuthGuardShell />;
  }

  const isExistingIntent = intent === "existing";
  const isResubmission = editingClaim?.status === "rejected";

  return (
    <main className="page-shell directory-page-shell home-page-shell business-claim-page-shell">
      <BodyClass className="home-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/business/claim" />

        <section className="auth-stage business-claim-stage">
          <article className="auth-card home-hero-card home-hero-copy business-claim-copy">
            <h1 className="auth-title">
              {isResubmission ? "Revise your verification claim." : "Claim your business."}
            </h1>
            <p className="home-hero-lede">
              {isExistingIntent
                ? "Select the FOUND company profile you manage, tell us who is submitting the claim, and we’ll review it manually."
                : "Tell us about the new business profile you want to add to FOUND and we’ll review it manually before unlocking editing."}
            </p>

            <div className="business-claim-points">
              <div className="business-claim-point">
                <strong>Step one</strong>
                <p>
                  {isExistingIntent
                    ? "Find the existing business listing you want to manage."
                    : "Share the business details you want us to verify."}
                </p>
              </div>
              <div className="business-claim-point">
                <strong>Step two</strong>
                <p>Submit your role, business contact details, and any context that helps us confirm the claim.</p>
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
                <div className="auth-toggle-grid" role="radiogroup" aria-label="Claim intent">
                  <button
                    aria-checked={isExistingIntent}
                    className={`auth-toggle auth-toggle-intent ${isExistingIntent ? "is-active" : ""}`}
                    onClick={() => {
                      setIntent("existing");
                      setError("");
                    }}
                    role="radio"
                    type="button"
                  >
                    <strong>Claim an existing business</strong>
                  </button>
                  <button
                    aria-checked={!isExistingIntent}
                    className={`auth-toggle auth-toggle-intent ${!isExistingIntent ? "is-active" : ""}`}
                    onClick={() => {
                      setIntent("new");
                      setSelectedCompany(null);
                      window.sessionStorage.removeItem(CLAIM_SIGNUP_STORAGE_KEY);
                      setError("");
                    }}
                    role="radio"
                    type="button"
                  >
                    <strong>Add a new business</strong>
                  </button>
                </div>

                {isExistingIntent ? (
                  <label className="contact-field">
                    <span className="contact-field-label">Find your business on FOUND</span>
                    <input
                      onChange={(event) => {
                        setCompanySearch(event.target.value);
                        setSelectedCompany(null);
                        setError("");
                      }}
                      placeholder="Search by business name"
                      required
                      value={companySearch}
                    />
                    {selectedCompany ? (
                      <p className="auth-inline-note">
                        Claiming: <strong>{selectedCompany.name}</strong>
                      </p>
                    ) : null}
                    {isSearchingCompanies ? (
                      <p className="auth-inline-note">Searching FOUND businesses...</p>
                    ) : null}
                    {!selectedCompany &&
                    companySearch.trim().length >= 2 &&
                    companyResults.length === 0 &&
                    !isSearchingCompanies ? (
                      <p className="auth-inline-note">
                        No matching FOUND businesses yet. Try a different name or choose “Add a new business.”
                      </p>
                    ) : null}
                    {!selectedCompany && companyResults.length > 0 ? (
                      <div className="business-claim-search-results">
                        {companyResults.map((company) => (
                          <button
                            className="business-claim-search-result"
                            key={company.id}
                            onClick={() => {
                              setSelectedCompany(company);
                              setCompanySearch(company.name);
                              setForm((current) => ({
                                ...current,
                                businessName: company.name,
                              }));
                              setError("");
                            }}
                            type="button"
                          >
                            {company.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>
                ) : (
                  <label className="contact-field">
                    <span className="contact-field-label">Business name</span>
                    <input
                      onChange={(event) =>
                        setForm((current) => ({ ...current, businessName: event.target.value }))
                      }
                      required
                      value={form.businessName}
                    />
                  </label>
                )}

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
                      required
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
                  <span className="contact-field-label">Business website or domain</span>
                  <input
                    onChange={(event) =>
                      setForm((current) => ({ ...current, businessDomain: event.target.value }))
                    }
                    placeholder="yourbusiness.com"
                    value={form.businessDomain}
                  />
                </label>

                <label className="contact-field">
                  <span className="contact-field-label">Business email</span>
                  <input
                    onChange={(event) =>
                      setForm((current) => ({ ...current, businessEmail: event.target.value }))
                    }
                    placeholder="info@domain.com"
                    required
                    type="email"
                    value={form.businessEmail}
                  />
                </label>

                <div className="auth-form-grid">
                  <label className="contact-field">
                    <span className="contact-field-label">Instagram</span>
                    <input
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          instagramHandle: event.target.value,
                        }))
                      }
                      placeholder="@yourbusiness"
                      value={form.instagramHandle}
                    />
                  </label>

                  <label className="contact-field">
                    <span className="contact-field-label">Facebook</span>
                    <input
                      onChange={(event) =>
                        setForm((current) => ({ ...current, facebookPage: event.target.value }))
                      }
                      placeholder="https://facebook.com/yourbusiness"
                      value={form.facebookPage}
                    />
                  </label>
                </div>

                <label className="contact-field">
                  <span className="contact-field-label">LinkedIn</span>
                  <input
                    onChange={(event) =>
                      setForm((current) => ({ ...current, linkedinPage: event.target.value }))
                    }
                    placeholder="https://linkedin.com/company/yourbusiness"
                    value={form.linkedinPage}
                  />
                </label>

                <label className="contact-field">
                  <span className="contact-field-label">Claim message</span>
                  <textarea
                    onChange={(event) =>
                      setForm((current) => ({ ...current, claimMessage: event.target.value }))
                    }
                    placeholder="Tell us how you're connected to the business and anything that will help us review the claim."
                    rows={5}
                    value={form.claimMessage}
                  />
                </label>

                {editingClaim?.status === "rejected" ? (
                  <article className="business-claim-status-card">
                    <span className="badge">Needs revision</span>
                    <h2>Reviewer feedback</h2>
                    {editingClaim.decision_reason_label ? (
                      <div className="auth-status-item">
                        <strong>Primary reason</strong>
                        <p>{editingClaim.decision_reason_label}</p>
                      </div>
                    ) : null}
                    {editingClaim.review_notes ? (
                      <div className="auth-status-item">
                        <strong>Notes</strong>
                        <p>{editingClaim.review_notes}</p>
                      </div>
                    ) : null}
                  </article>
                ) : null}

                {error ? (
                  <p className="contact-form-note is-error" role="alert">
                    <strong>Error:</strong> {error}
                  </p>
                ) : null}

                <div className="auth-form-actions">
                  <button
                    className="contact-submit"
                    disabled={isSubmitting || isLoadingClaim}
                    type="submit"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : isResubmission
                        ? "Revise and resubmit"
                        : "Submit claim"}
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

export default function BusinessClaimPage() {
  return (
    <Suspense fallback={<AuthGuardShell />}>
      <BusinessClaimPageContent />
    </Suspense>
  );
}
