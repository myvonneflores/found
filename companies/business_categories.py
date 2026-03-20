FOOD_AND_BEVERAGE_CATEGORY = "Food+Bev"

BUSINESS_CATEGORY_ALIASES = {
    "Food": FOOD_AND_BEVERAGE_CATEGORY,
}


def normalize_business_category_name(value):
    if not value:
        return value
    return BUSINESS_CATEGORY_ALIASES.get(value, value)


def business_category_query_names(value):
    normalized = normalize_business_category_name(value)
    if not normalized:
        return set()

    names = {normalized}
    for alias, canonical in BUSINESS_CATEGORY_ALIASES.items():
        if canonical == normalized:
            names.add(alias)
    return names


def is_food_and_beverage_category_name(value):
    return normalize_business_category_name(value) == FOOD_AND_BEVERAGE_CATEGORY
