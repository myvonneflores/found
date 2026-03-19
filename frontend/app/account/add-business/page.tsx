"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { AuthGuardShell } from "@/components/auth-guard-shell";
import { BodyClass } from "@/components/body-class";
import { CompanyProfileCreationForm } from "@/components/company-profile-creation-form";
import { SiteHeader } from "@/components/site-header";

export default function AddBusinessListingPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isReady, setRedirecting, user } = useAuth();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setRedirecting(true);
      router.replace("/login");
      return;
    }

    if (user?.account_type === "business") {
      setRedirecting(true);
      router.replace(user.is_business_verified ? "/business/dashboard" : "/business/pending");
    }
  }, [accessToken, isAuthenticated, isReady, router, setRedirecting, user]);

  if (!isReady || !user || user.account_type !== "personal") {
    return <AuthGuardShell />;
  }

  return (
    <main className="page-shell directory-page-shell detail-page-shell auth-page-shell dashboard-page-shell">
      <BodyClass className="detail-page-body dashboard-page-body" />
      <div className="directory-shell">
        <SiteHeader resetKey="/account/add-business" />

        <section className="dashboard-stage business-company-stage">
          <article className="panel dashboard-banner business-company-banner">
            <h1 className="home-hero-title">Add a local business to FOUND</h1>
            <p className="lede">
              Help grow the directory by adding a spot you love. Community-submitted listings get a Community Listed
              badge until an owner claims them.
            </p>
          </article>

          <CompanyProfileCreationForm mode="community" />
        </section>
      </div>
    </main>
  );
}
