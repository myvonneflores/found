import { CompanyListItem } from "@/types/company";

export interface Recommendation {
  id: number;
  id_hash: string;
  company: CompanyListItem;
  title: string;
  body: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
