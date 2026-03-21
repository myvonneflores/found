"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { AuthGuardShell } from "@/components/auth-guard-shell";
import { BodyClass } from "@/components/body-class";
import { CompanyProfileCreationForm } from "@/components/company-profile-creation-form";
import { SiteHeader } from "@/components/site-header";
import { getManagedBusinessProfile, listBusinessClaims, listManagedBusinessLocations } from "@/lib/api";
import type { BusinessClaim } from "@/types/auth";
import type { CompanyCreatePayload, ManagedBusinessLocation } from "@/types/company";

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

export default function BusinessCompanyPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, setRedirecting, user } = useAuth();
  const [latestClaim, setLatestClaim] = useState<BusinessClaim | null>(null);
  const [managedLocations, setManagedLocations] = useState<ManagedBusinessLocation[]>([]);
  const [seedProfile, setSeedProfile] = useState<Partial<CompanyCreatePayload> | null>(null);
  const hasExistingBusinessProfile = managedLocations.length > 0 || seedProfile !== null;

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setRedirecting(true);
      router.replace("/login");
      return;
    }

    if (user?.account_type !== "business") {
      setRedirecting(true);
      router.replace("/account");
      return;
    }

    if (!user.is_business_verified) {
      setRedirecting(true);
      router.replace("/business/pending");
      return;
    }

    let isMounted = true;

    async function loadBusinessRoute() {
      const [claimResult, locationsResult, primaryProfileResult] = await Promise.allSettled([
        listBusinessClaims(accessToken!),
        listManagedBusinessLocations(accessToken!),
        getManagedBusinessProfile(accessToken!),
      ]);

      if (!isMounted) {
        return;
      }

      setLatestClaim(
        claimResult.status === "fulfilled" ? normalizeClaims(claimResult.value)[0] ?? null : null
      );
      setManagedLocations(locationsResult.status === "fulfilled" ? locationsResult.value : []);

      if (primaryProfileResult.status === "fulfilled") {
        const primaryProfile = primaryProfileResult.value;
        setSeedProfile({
          name: primaryProfile.name,
          description: primaryProfile.description,
          website: primaryProfile.website,
          business_hours: primaryProfile.business_hours,
          business_hours_timezone: primaryProfile.business_hours_timezone,
          business_category: primaryProfile.business_category,
          business_categories: primaryProfile.business_categories,
          product_categories: primaryProfile.product_categories,
          cuisine_types: primaryProfile.cuisine_types,
          ownership_markers: primaryProfile.ownership_markers,
          sustainability_markers: primaryProfile.sustainability_markers,
          instagram_handle: primaryProfile.instagram_handle,
          facebook_page: primaryProfile.facebook_page,
          linkedin_page: primaryProfile.linkedin_page,
          is_vegan_friendly: primaryProfile.is_vegan_friendly,
          is_gf_friendly: primaryProfile.is_gf_friendly,
        });
      } else {
        setSeedProfile(null);
      }
    }

    void loadBusinessRoute();

    return () => {
      isMounted = false;
    };
  }, [accessToken, isAuthenticated, isReady, router, user]);

  if (!isReady || !user || user.account_type !== "business" || !user.is_business_verified) {
    return <AuthGuardShell />;
  }

  return (
    <main className="page-shell directory-page-shell detail-page-shell auth-page-shell dashboard-page-shell">
      <BodyClass className="detail-page-body dashboard-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/business/company" />

        <section className="dashboard-stage business-company-stage">
          <article className="panel dashboard-banner business-company-banner">
            <h1 className="home-hero-title">
              {hasExistingBusinessProfile ? "Add another location" : "Create your company profile"}
            </h1>
            <p className="lede">
              {hasExistingBusinessProfile
                ? "Create a new storefront page while keeping your shared brand details consistent across locations."
                : "Build the actual FOUND business page your community will see. Once it&apos;s live, you&apos;ll edit the company profile directly."}
            </p>
          </article>

          {managedLocations.length ? (
            <article className="detail-card">
              <span className="field-label">Managed locations</span>
              <div className="detail-recommendations-pill-grid">
                {managedLocations.map((location) => (
                  <Link
                    className="dashboard-row dashboard-row-link dashboard-chip-link dashboard-chip-button detail-recommendation-pill"
                    href={`/companies/${location.slug}?edit=1`}
                    key={location.slug}
                  >
                    <span className="dashboard-chip-label">
                      <strong>{location.name}</strong>
                      <span>{[location.address, location.city, location.state].filter(Boolean).join(", ") || "Location details coming soon"}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </article>
          ) : null}

          <CompanyProfileCreationForm latestClaim={latestClaim} seedProfile={seedProfile} />
        </section>
      </div>
    </main>
  );
}
