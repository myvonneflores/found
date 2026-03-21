"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useDeferredValue, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import { listCompanies, loginUser, registerUser } from "@/lib/api";
import { AccountType } from "@/types/auth";

type BusinessIntent = "existing" | "new";
type SelectedCompany = {
  id: number;
  name: string;
  slug: string;
};
const CLAIM_SIGNUP_STORAGE_KEY = "found-signup-claim-company";
const SIGNUP_DRAFT_STORAGE_KEY = "found-signup-draft";

const accountOptions: Array<{ value: AccountType; title: string }> = [
  {
    value: "personal",
    title: "Personal",
  },
  {
    value: "business",
    title: "Business",
  },
];

const businessIntentOptions: Array<{ value: BusinessIntent; title: string }> = [
  {
    value: "existing",
    title: "Claim an existing business",
  },
  {
    value: "new",
    title: "Add a new business",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [businessIntent, setBusinessIntent] = useState<BusinessIntent>("existing");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [certifiedLocalOwnership, setCertifiedLocalOwnership] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const deferredCompanySearch = useDeferredValue(companySearch);
  const [companyResults, setCompanyResults] = useState<SelectedCompany[]>([]);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<SelectedCompany | null>(null);

  useEffect(() => {
    try {
      const rawDraft = window.sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        setHasLoadedDraft(true);
        return;
      }

      const draft = JSON.parse(rawDraft) as {
        accountType?: AccountType;
        businessIntent?: BusinessIntent;
        form?: typeof form;
        agreedToTerms?: boolean;
        certifiedLocalOwnership?: boolean;
        companySearch?: string;
        selectedCompany?: SelectedCompany | null;
      };

      if (draft.accountType === "personal" || draft.accountType === "business") {
        setAccountType(draft.accountType);
      }
      if (draft.businessIntent === "existing" || draft.businessIntent === "new") {
        setBusinessIntent(draft.businessIntent);
      }
      if (draft.form) {
        setForm((current) => ({
          ...current,
          ...draft.form,
        }));
      }
      setAgreedToTerms(Boolean(draft.agreedToTerms));
      setCertifiedLocalOwnership(Boolean(draft.certifiedLocalOwnership));
      setCompanySearch(draft.companySearch ?? "");
      setSelectedCompany(draft.selectedCompany ?? null);
    } catch {
      window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
    } finally {
      setHasLoadedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    window.sessionStorage.setItem(
      SIGNUP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        accountType,
        businessIntent,
        form,
        agreedToTerms,
        certifiedLocalOwnership,
        companySearch,
        selectedCompany,
      })
    );
  }, [
    accountType,
    agreedToTerms,
    businessIntent,
    certifiedLocalOwnership,
    companySearch,
    form,
    hasLoadedDraft,
    selectedCompany,
  ]);

  useEffect(() => {
    async function searchCompanies() {
      if (accountType !== "business" || businessIntent !== "existing") {
        setCompanyResults([]);
        setIsSearchingCompanies(false);
        return;
      }

      const query = deferredCompanySearch.trim();
      if (query.length < 2) {
        setCompanyResults([]);
        setIsSearchingCompanies(false);
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
  }, [accountType, businessIntent, deferredCompanySearch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const submittedFirstName = String(formData.get("firstName") ?? "");
    const submittedLastName = String(formData.get("lastName") ?? "");
    const submittedDisplayName = String(formData.get("displayName") ?? "");
    const submittedEmail = String(formData.get("email") ?? "");
    const submittedPassword = String(formData.get("password") ?? "");
    const submittedConfirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!agreedToTerms) {
      setError("Please agree to the Terms & Conditions to continue.");
      return;
    }

    if (accountType === "business" && !certifiedLocalOwnership) {
      setError("Please certify that your business is locally owned to create a business account.");
      return;
    }

    if (submittedPassword !== submittedConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (accountType === "business" && businessIntent === "existing" && !selectedCompany) {
      setError("Please choose the business listing you want to claim before creating your account.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser({
        email: submittedEmail,
        password: submittedPassword,
        first_name: submittedFirstName,
        last_name: submittedLastName,
        display_name: submittedDisplayName || submittedFirstName,
        account_type: accountType,
        certify_local_ownership: accountType === "business" ? certifiedLocalOwnership : undefined,
      });

      const session = await loginUser({
        email: submittedEmail,
        password: submittedPassword,
      });

      signIn(session);
      window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      if (accountType === "business" && businessIntent === "existing" && selectedCompany) {
        window.sessionStorage.setItem(CLAIM_SIGNUP_STORAGE_KEY, JSON.stringify(selectedCompany));
      } else {
        window.sessionStorage.removeItem(CLAIM_SIGNUP_STORAGE_KEY);
      }

      router.push(accountType === "business" ? `/business/claim?intent=${businessIntent}` : "/account");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong while creating your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell directory-page-shell auth-page-shell">
      <BodyClass className="auth-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/signup" />

        <section className="auth-stage">
          <article className="auth-card auth-hero-card auth-hero-card-signup">
            <h1 className="auth-title">Save your favorites and share with friends.</h1>
            <p className="lede">
              Personal accounts are for discovery and curation. Business accounts are for claiming your listing and
              building community.
            </p>

            <div className="auth-toggle-grid auth-signup-account-toggle" role="radiogroup" aria-label="Account type">
              {accountOptions.map((option) => (
                <button
                  key={option.value}
                  className={`auth-toggle ${accountType === option.value ? "is-active" : ""}`}
                  onClick={() => setAccountType(option.value)}
                  type="button"
                >
                  <strong>{option.title}</strong>
                </button>
              ))}
            </div>

            {accountType === "business" ? (
              <div className="auth-business-intent">
                <p className="auth-inline-note">Are you claiming an existing business or adding a new one?</p>
                <div className="auth-toggle-grid" role="radiogroup" aria-label="Business intent">
                  {businessIntentOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`auth-toggle auth-toggle-intent ${businessIntent === option.value ? "is-active" : ""}`}
                      onClick={() => {
                        setBusinessIntent(option.value);
                        setError("");
                      }}
                      type="button"
                    >
                      <strong>{option.title}</strong>
                    </button>
                  ))}
                </div>

                {businessIntent === "existing" ? (
                  <label className="contact-field">
                    <span className="contact-field-label">Find your business on FOUND</span>
                    <input
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setCompanySearch(nextValue);
                        setSelectedCompany((current) =>
                          current && current.name === nextValue ? current : null
                        );
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
                    {!selectedCompany && companySearch.trim().length >= 2 && companyResults.length === 0 && !isSearchingCompanies ? (
                      <p className="auth-inline-note">No matching FOUND businesses yet. Try a different name or choose “Add a new business.”</p>
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
                                displayName: current.displayName || company.name,
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
                ) : null}
              </div>
            ) : null}
          </article>

          <article className="auth-card auth-form-card auth-form-card-signup">
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-form-grid">
                <label className="contact-field">
                  <span className="contact-field-label">First name</span>
                  <input
                    autoComplete="given-name"
                    name="firstName"
                    onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                    required
                    value={form.firstName}
                  />
                </label>
                <label className="contact-field">
                  <span className="contact-field-label">Last name</span>
                  <input
                    autoComplete="family-name"
                    name="lastName"
                    onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                    required
                    value={form.lastName}
                  />
                </label>
              </div>

              <label className="contact-field">
                <span className="contact-field-label">Display name</span>
                <input
                  autoComplete="nickname"
                  name="displayName"
                  onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder={
                    accountType === "business"
                      ? businessIntent === "new"
                        ? "what's your business name?"
                        : "what business are you claiming?"
                      : "what should we call you?"
                  }
                  value={form.displayName}
                />
              </label>

              <label className="contact-field">
                <span className="contact-field-label">Email</span>
                <input
                  autoCapitalize="none"
                  autoComplete="email"
                  name="email"
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                  spellCheck={false}
                  type="email"
                  value={form.email}
                />
              </label>

              <label className="contact-field">
                <span className="contact-field-label">Password</span>
                <div className="auth-password-field">
                  <input
                    autoComplete="new-password"
                    minLength={8}
                    name="password"
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    required
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                      <circle cx="12" cy="12" fill="none" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                      {showPassword ? (
                        <path
                          d="M4 20 20 4"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="1.8"
                        />
                      ) : null}
                    </svg>
                  </button>
                </div>
              </label>

              <label className="contact-field">
                <span className="contact-field-label">Confirm password</span>
                <div className="auth-password-field">
                  <input
                    autoComplete="new-password"
                    minLength={8}
                    name="confirmPassword"
                    onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                  />
                  <button
                    aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                      <circle cx="12" cy="12" fill="none" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                      {showConfirmPassword ? (
                        <path
                          d="M4 20 20 4"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="1.8"
                        />
                      ) : null}
                    </svg>
                  </button>
                </div>
              </label>

              <p className="auth-inline-note">
                {accountType === "business"
                  ? "Business accounts can sign in right away, then submit their listing claim for review."
                  : "Personal accounts can start saving favorites and building lists right away."}
              </p>

              {accountType === "business" ? (
                <label className="contact-field contact-field-checkbox">
                  <input
                    checked={certifiedLocalOwnership}
                    onChange={(event) => setCertifiedLocalOwnership(event.target.checked)}
                    required
                    type="checkbox"
                  />
                  <span>I certify that the business I am representing on FOUND is locally owned.</span>
                </label>
              ) : null}

              <label className="contact-field contact-field-checkbox">
                <input
                  checked={agreedToTerms}
                  onChange={(event) => setAgreedToTerms(event.target.checked)}
                  required
                  type="checkbox"
                />
                <span>
                  I agree to the{" "}
                  <Link className="contact-link" href="/terms-and-conditions" target="_blank" rel="noreferrer">
                    Terms & Conditions
                  </Link>
                  .
                </span>
              </label>

              {error ? (
                <p className="contact-form-note is-error" role="alert">
                  <strong>Error:</strong> {error}
                </p>
              ) : null}

              <div className="auth-form-actions">
                <button className="contact-submit" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Creating..." : "Create account"}
                </button>
                <Link className="auth-text-link" href="/login">
                  Already have an account? Log in
                </Link>
              </div>
            </form>
          </article>
        </section>
      </div>
    </main>
  );
}
