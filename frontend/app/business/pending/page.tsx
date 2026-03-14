"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { SiteHeader } from "@/components/site-header";
import { listBusinessClaims } from "@/lib/api";
import { BusinessClaim } from "@/types/auth";

export default function BusinessPendingPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, refreshUser, user } = useAuth();
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
    }
  }, [isAuthenticated, isReady, router, user]);

  useEffect(() => {
    async function loadData() {
      if (!accessToken || !user || user.account_type !== "business") {
        setIsLoading(false);
        return;
      }

      try {
        const [nextClaims] = await Promise.all([listBusinessClaims(accessToken), refreshUser()]);
        setClaims(nextClaims);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load your verification status.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [accessToken, refreshUser, user]);

  if (!isReady || !user || user.account_type !== "business") {
    return null;
  }

  const latestClaim = claims[0];

  return (
    <main className="page-shell directory-page-shell auth-page-shell">
      <BodyClass className="auth-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/business/pending" />

        <section className="dashboard-stage">
          <article className="auth-card dashboard-hero-card">
            <div className="auth-kicker">Verification in progress</div>
            <h1 className="auth-title">Your business tools are warming up.</h1>
            <p className="lede">
              You can sign in and track progress here while we verify your relationship to the business. Once approved,
              this account will unlock listing management and community curation tools.
            </p>
          </article>

          <div className="dashboard-grid">
            <article className="auth-card dashboard-card">
              <h2>Status</h2>
              {isLoading ? <p className="lede">Checking your claim status...</p> : null}
              {!isLoading && latestClaim ? (
                <>
                  <div className="auth-status-item">
                    <div>
                      <strong>{latestClaim.business_name}</strong>
                      <p>Submitted {new Date(latestClaim.submitted_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`badge ${latestClaim.status === "rejected" ? "badge-muted" : "badge-outline"}`}>
                      {latestClaim.status}
                    </span>
                  </div>
                  <p className="lede">
                    {latestClaim.status === "rejected"
                      ? latestClaim.review_notes || "This claim needs updates before it can be approved."
                      : "We’ll use the details you submitted to review and verify this business account."}
                  </p>
                </>
              ) : null}
              {!isLoading && !latestClaim ? (
                <p className="lede">You have not submitted a claim yet. Submit one now to start verification.</p>
              ) : null}
              {error ? <p className="contact-form-note is-error">{error}</p> : null}
            </article>

            <article className="auth-card dashboard-card">
              <h2>What unlocks after approval</h2>
              <div className="auth-bullet-list">
                <p>Manage your FOUND business profile and keep your public details fresh.</p>
                <p>Create business-curated lists, favorites, and community recommendations.</p>
                <p>Build a more active local presence without waiting for the admin team to make routine edits.</p>
              </div>
            </article>
          </div>

          <article className="auth-card dashboard-footer-card">
            <div>
              <h2>{latestClaim ? "Need to submit another claim?" : "Ready to submit your first claim?"}</h2>
              <p className="lede">If your listing is new or your status changed, you can send us fresh details here.</p>
            </div>
            <Link className="contact-submit" href="/business/claim">
              {latestClaim ? "Submit another claim" : "Start claim"}
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
