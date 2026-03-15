"use client";

import Link from "next/link";
import type { BusinessClaim } from "@/types/auth";

export function BusinessProfileCard({
  isVerified,
  latestClaim,
}: {
  isVerified: boolean;
  latestClaim: BusinessClaim | null;
}) {
  const isPendingVerification = !isVerified && Boolean(latestClaim);

  if (isPendingVerification) {
    return (
      <article className="dashboard-logout-strip dashboard-business-claim-strip dashboard-business-claim-strip-static">
        <div
          aria-disabled="true"
          className="dashboard-logout-button dashboard-business-claim-link dashboard-business-claim-link-static"
        >
          PENDING VERIFICATION
        </div>
      </article>
    );
  }

  const ctaHref = isVerified
    ? latestClaim?.company_slug
      ? `/companies/${latestClaim.company_slug}?edit=1`
      : "/business/company"
    : "/business/claim";
  const ctaLabel = isVerified ? "EDIT MY BUSINESS" : "CLAIM MY BUSINESS";

  return (
    <article className="dashboard-logout-strip dashboard-business-claim-strip">
      <Link className="dashboard-logout-button dashboard-business-claim-link" href={ctaHref}>
        {ctaLabel}
      </Link>
    </article>
  );
}
