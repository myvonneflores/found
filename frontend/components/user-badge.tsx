"use client";

import type { CSSProperties } from "react";

import type { UserBadge as UserBadgeType } from "@/types/auth";

type UserBadgeProps = {
  badge: UserBadgeType;
  className?: string;
  size?: number;
  variant?: "pill" | "seal";
};

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

function CommunityContributorSeal({
  badge,
  className,
  size = 78,
}: Pick<UserBadgeProps, "badge" | "className" | "size">) {
  const style = {
    "--badge-seal-size": `${size}px`,
  } as CSSProperties;

  return (
    <span className={classNames("profile-badge-seal", className)} style={style}>
      <img
        alt={badge.label}
        className="profile-badge-seal-image"
        height="960"
        loading="lazy"
        src="/community-contributor-badge-v5.png"
        title={badge.label}
        width="1102"
      />
    </span>
  );
}

export function UserBadge({
  badge,
  className,
  size,
  variant = badge.slug === "community-contributor" ? "seal" : "pill",
}: UserBadgeProps) {
  if (badge.slug === "community-contributor" && variant === "seal") {
    return <CommunityContributorSeal badge={badge} className={className} size={size} />;
  }

  return (
    <span className={classNames("badge", "badge-profile", `badge-${badge.slug}`, className)}>
      {badge.label}
    </span>
  );
}
