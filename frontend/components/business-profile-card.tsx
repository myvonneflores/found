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
  const isPendingVerification = !isVerified && latestClaim?.status === "pending";
  const isRejected = !isVerified && latestClaim?.status === "rejected";

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

  if (isRejected && latestClaim) {
    return (
      <article className="dashboard-logout-strip dashboard-business-claim-strip">
        <Link
          className="dashboard-logout-button dashboard-business-claim-link"
          href={`/business/claim?claim=${latestClaim.id}`}
        >
          REVISE MY CLAIM
        </Link>
      </article>
    );
  }

  const ctaHref = isVerified ? "/business/dashboard" : "/business/claim";
  const ctaLabel = isVerified ? "MANAGE MY LOCATIONS" : "CLAIM MY BUSINESS";

  return (
    <article className="dashboard-logout-strip dashboard-business-claim-strip">
      <Link className="dashboard-logout-button dashboard-business-claim-link" href={ctaHref}>
        {ctaLabel}
      </Link>
    </article>
  );
}
