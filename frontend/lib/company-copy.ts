import { CompanyDetail, CompanyListItem } from "@/types/company";

function tidySentence(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "";
  }
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

export function listDescription(company: CompanyListItem) {
  const cleaned = tidySentence(company.description);
  return cleaned;
}

export function detailDescription(company: CompanyDetail) {
  const cleaned = tidySentence(company.description);
  return cleaned;
}
