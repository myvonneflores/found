import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BodyClass } from "@/components/body-class";
import { PublicProfileBrowser } from "@/components/public-profile-browser";
import { SiteHeader } from "@/components/site-header";
import { getPublicProfile } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}): Promise<Metadata> {
  try {
    const { publicSlug } = await params;
    const profile = await getPublicProfile(publicSlug);
    const metadataDescription =
      profile.bio ||
      profile.location ||
      `Explore public lists curated by ${profile.display_name} on FOUND.`;

    return {
      title: profile.display_name,
      description: metadataDescription,
      alternates: {
        canonical: `/profiles/${profile.public_slug}`,
      },
    };
  } catch {
    return {
      title: "Profile not found",
    };
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  try {
    const { publicSlug } = await params;
    const profile = await getPublicProfile(publicSlug);

    return (
      <main className="page-shell directory-page-shell auth-page-shell public-profile-page-shell dashboard-page-shell">
        <BodyClass className="public-profile-page-body dashboard-page-body" />
        <div className="directory-shell">
          <SiteHeader resetKey={`/profiles/${publicSlug}`} />
          <PublicProfileBrowser profile={profile} />
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
