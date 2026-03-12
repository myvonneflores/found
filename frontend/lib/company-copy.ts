import { CompanyDetail, CompanyListItem } from "@/types/company";

function tidySentence(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "";
  }
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function fallbackByCategory(category?: string | null) {
  switch (category) {
    case "Food":
      return "Independent food business in the Found directory.";
    case "Health/Wellness & Beauty":
      return "Independent wellness and beauty business in the Found directory.";
    case "Retail":
      return "Independent retail business in the Found directory.";
    default:
      return "Independent business in the Found directory.";
  }
}

export function listDescription(company: CompanyListItem) {
  const cleaned = tidySentence(company.description);
  if (cleaned) {
    return cleaned;
  }
  return fallbackByCategory(company.business_category);
}

export function detailDescription(company: CompanyDetail) {
  const cleaned = tidySentence(company.description);
  if (cleaned) {
    return cleaned;
  }
  return fallbackByCategory(company.business_category?.name);
}
