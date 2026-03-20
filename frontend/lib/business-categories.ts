import type { TaxonomyItem } from "@/types/company";

const FOOD_AND_BEVERAGE_CATEGORY = "Food+Bev";
const BUSINESS_CATEGORY_ALIAS_KEYS: Record<string, string> = {
  food: FOOD_AND_BEVERAGE_CATEGORY,
  foodbev: FOOD_AND_BEVERAGE_CATEGORY,
  foodbeverage: FOOD_AND_BEVERAGE_CATEGORY,
  foodandbev: FOOD_AND_BEVERAGE_CATEGORY,
  foodandbeverage: FOOD_AND_BEVERAGE_CATEGORY,
};

function categoryKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normalizeBusinessCategoryName(value: string | null | undefined) {
  if (!value) {
    return value ?? null;
  }

  const trimmedValue = value.trim();
  return BUSINESS_CATEGORY_ALIAS_KEYS[categoryKey(trimmedValue)] ?? trimmedValue;
}

export function normalizeBusinessCategoryNames(values: string[]) {
  const seen = new Set<string>();
  const normalizedValues: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeBusinessCategoryName(value);
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    normalizedValues.push(normalized);
  });

  return normalizedValues;
}

export function normalizeBusinessCategoryItems(values: TaxonomyItem[]) {
  const normalizedByName = new Map<string, TaxonomyItem>();

  values.forEach((value) => {
    const normalizedName = normalizeBusinessCategoryName(value.name);
    if (!normalizedName) {
      return;
    }

    const normalizedItem =
      normalizedName === value.name
        ? value
        : {
            ...value,
            name: normalizedName,
          };
    const existing = normalizedByName.get(normalizedName);

    if (!existing || value.name === normalizedName) {
      normalizedByName.set(normalizedName, normalizedItem);
    }
  });

  return Array.from(normalizedByName.values()).sort((left, right) => left.name.localeCompare(right.name));
}
