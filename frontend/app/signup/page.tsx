"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import { loginUser, registerUser } from "@/lib/api";
import { AccountType } from "@/types/auth";

const accountOptions: Array<{ value: AccountType; title: string; description: string }> = [
  {
    value: "personal",
    title: "Personal",
    description: "Create favorites, build lists, and shape a public profile inspired by discovery communities.",
  },
  {
    value: "business",
    title: "Business",
    description: "Claim your FOUND listing, keep details current, and participate in local recommendations.",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

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
      router.push(accountType === "business" ? "/business/claim" : "/account");
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
          <article className="auth-card auth-hero-card">
            <div className="auth-kicker">Join Found</div>
            <h1 className="auth-title">Choose the kind of presence you want to build.</h1>
            <p className="lede">
              Personal accounts are for discovery and curation. Business accounts are for claiming your listing and
              contributing to the local community as a verified business.
            </p>
          </article>

          <article className="auth-card auth-form-card">
            <div className="auth-toggle-grid" role="radiogroup" aria-label="Account type">
              {accountOptions.map((option) => (
                <button
                  key={option.value}
                  className={`auth-toggle ${accountType === option.value ? "is-active" : ""}`}
                  onClick={() => setAccountType(option.value)}
                  type="button"
                >
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>

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
                  placeholder={accountType === "business" ? "How your name should appear" : "What people should call you"}
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
                <input
                  minLength={8}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  required
                  type="password"
                  value={form.password}
                />
              </label>

              <p className="auth-inline-note">
                {accountType === "business"
                  ? "Business accounts can sign in right away, then submit their listing claim for verification."
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
