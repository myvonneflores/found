"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BodyClass } from "@/components/body-class";
import { CompanyProfileCreationForm } from "@/components/company-profile-creation-form";
import { SiteHeader } from "@/components/site-header";
import { getManagedBusinessProfile, listBusinessClaims } from "@/lib/api";
import type { BusinessClaim } from "@/types/auth";

function normalizeClaims(value: BusinessClaim[] | unknown): BusinessClaim[] {
  if (Array.isArray(value)) {
    return value as BusinessClaim[];
  }

  if (
    value &&
    typeof value === "object" &&
    "results" in value &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: BusinessClaim[] }).results;
  }

  return [];
}

function isMissingManagedProfileError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("404") ||
    normalized.includes("not found") ||
    normalized.includes("no company") ||
    normalized.includes("verified business profile to manage yet")
  );
}

export default function BusinessCompanyPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, user } = useAuth();
  const [latestClaim, setLatestClaim] = useState<BusinessClaim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }

    if (user?.account_type !== "business") {
      router.replace("/account");
      return;
    }

    if (!user.is_business_verified) {
      router.replace("/business/pending");
      return;
    }

    let isMounted = true;

    async function loadBusinessRoute() {
      try {
        const claimResponse = await listBusinessClaims(accessToken!);
        const claims = normalizeClaims(claimResponse);
        const verifiedClaim = claims.find((claim) => claim.status === "verified") ?? null;
        const nextLatestClaim = verifiedClaim ?? claims[0] ?? null;

        if (!isMounted) {
          return;
        }

        setLatestClaim(nextLatestClaim);

        if (verifiedClaim?.company_slug) {
          router.replace(`/companies/${verifiedClaim.company_slug}?edit=1`);
          return;
        }

        try {
          const managedProfile = await getManagedBusinessProfile(accessToken!);
          if (!isMounted) {
            return;
          }
          router.replace(`/companies/${managedProfile.slug}?edit=1`);
          return;
        } catch (managedError) {
          if (!isMounted) {
            return;
          }

          if (!isMissingManagedProfileError(managedError instanceof Error ? managedError.message : "")) {
            setError(
              managedError instanceof Error
                ? managedError.message
                : "Unable to open your business profile right now."
            );
          }
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your business claim right now."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBusinessRoute();

    return () => {
      isMounted = false;
    };
  }, [accessToken, isAuthenticated, isReady, router, user]);

  if (!isReady || !user || user.account_type !== "business" || !user.is_business_verified) {
    return null;
  }

  return (
    <main className="page-shell directory-page-shell detail-page-shell auth-page-shell dashboard-page-shell">
      <BodyClass className="detail-page-body dashboard-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/business/company" />

        <section className="dashboard-stage business-company-stage">
          <article className="panel dashboard-banner business-company-banner">
            <h1 className="home-hero-title">Create your company profile</h1>
            <p className="lede">
              Build the actual FOUND business page your community will see. Once it&apos;s live, you&apos;ll edit the
              company profile directly.
            </p>
          </article>

          {isLoading ? (
            <article className="detail-card">
              <p className="lede">Loading your business profile workspace...</p>
            </article>
          ) : null}

          {!isLoading && error ? (
            <article className="detail-card">
              <p className="contact-form-note is-error">{error}</p>
            </article>
          ) : null}

          {!isLoading && !error ? <CompanyProfileCreationForm latestClaim={latestClaim} /> : null}
        </section>
      </div>
    </main>
  );
}
