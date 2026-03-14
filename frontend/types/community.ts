import { CompanyListItem } from "@/types/company";

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

export interface PublicCuratedList extends CuratedList {
  owner: {
    display_name: string;
    public_slug: string;
    account_type: "personal" | "business";
  };
}
