import { UserBadge } from "@/types/auth";
import { PublicCuratedList } from "@/types/community";
import { Recommendation } from "@/types/recommendation";

export interface PersonalProfile {
  bio: string;
  location: string;
  avatar_url: string;
  is_public: boolean;
}

export interface PublicProfile {
  display_name: string;
  public_slug: string;
  account_type: "personal" | "business";
  bio: string;
  location: string;
  avatar_url: string;
  business_company_slug: string | null;
  badges: UserBadge[];
  public_lists: PublicCuratedList[];
  public_recommendations: Recommendation[];
}
