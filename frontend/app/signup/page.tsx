"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import { loginUser, registerUser } from "@/lib/api";
import { AccountType } from "@/types/auth";

type BusinessIntent = "existing" | "new";

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser({
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        last_name: form.lastName,
        display_name: form.displayName || form.firstName,
        account_type: accountType,
      });

      const session = await loginUser({
        email: form.email,
        password: form.password,
      });

      signIn(session);
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
                      onClick={() => setBusinessIntent(option.value)}
                      type="button"
                    >
                      <strong>{option.title}</strong>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          <article className="auth-card auth-form-card auth-form-card-signup">
            <form className="auth-form" onSubmit={handleSubmit}>
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

              <label className="contact-field">
                <span className="contact-field-label">Display name</span>
                <input
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
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                  type="email"
                  value={form.email}
                />
              </label>

              <label className="contact-field">
                <span className="contact-field-label">Password</span>
                <div className="auth-password-field">
                  <input
                    minLength={8}
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
                    minLength={8}
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

              {error ? <p className="contact-form-note is-error">{error}</p> : null}

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
