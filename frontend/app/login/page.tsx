"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import { loginUser } from "@/lib/api";

function destinationForUser(accountType: string, isBusinessVerified: boolean) {
  if (accountType === "business") {
    return isBusinessVerified ? "/business/dashboard" : "/business/pending";
  }

  return "/account";
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated && user) {
      router.replace(destinationForUser(user.account_type, user.is_business_verified));
    }
  }, [isAuthenticated, isReady, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const session = await loginUser({ email, password });
      signIn(session);
      router.push(destinationForUser(session.user.account_type, session.user.is_business_verified));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell directory-page-shell auth-page-shell">
      <BodyClass className="auth-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/login" />

        <section className="auth-stage auth-stage-login">
          <article className="auth-card auth-form-card">
            <div className="auth-kicker">Welcome back</div>
            <h1 className="auth-title">Log in to continue your FOUND account.</h1>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="contact-field">
                <span className="contact-field-label">Email</span>
                <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
              </label>

              <label className="contact-field">
                <span className="contact-field-label">Password</span>
                <div className="auth-password-field">
                  <input
                    minLength={8}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
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

              {error ? <p className="contact-form-note is-error">{error}</p> : null}

              <div className="auth-form-actions">
                <button className="contact-submit" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Logging in..." : "Log in"}
                </button>
                <Link className="auth-text-link" href="/signup">
                  Need an account? Sign up
                </Link>
              </div>
            </form>
          </article>
        </section>
      </div>
    </main>
  );
}
