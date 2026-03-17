import { CompanyListItem } from "@/types/company";

export interface CuratedListOwner {
  display_name: string;
  public_slug: string;
  account_type: "personal" | "business";
}

export interface PublicCuratedListPreviewCompany {
  id: number;
  slug: string;
  name: string;
  city: string;
  state: string;
  country: string;
}

export interface Favorite {
  id: number;
  company: CompanyListItem;
  created_at: string;
}

export interface CuratedListItem {
  id: number;
  company: CompanyListItem;
  note: string;
  position: number;
  created_at: string;
}

export interface CuratedList {
  id: number;
  id_hash: string;
  title: string;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  items: CuratedListItem[];
}

export interface PublicCuratedListPreview {
  id: number;
  id_hash: string;
  title: string;
  description: string;
  updated_at: string;
  item_count: number;
  owner: CuratedListOwner;
  preview_companies: PublicCuratedListPreviewCompany[];
}

export interface PublicCuratedList extends CuratedList {
  owner: CuratedListOwner;
}

export interface SavedCuratedList {
  id: number;
  created_at: string;
  list: PublicCuratedListPreview;
}
