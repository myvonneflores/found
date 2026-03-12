CITY_ALIASES = {
    "Gresham": "Portland",
    "Brooklyn": "New York",
    "Woodstock": "New York",
    "Long Beach": "Los Angeles",
    "Venice": "Los Angeles",
    "West Hollywood": "Los Angeles",
}


def canonicalize_city(value):
    city = (value or "").strip()
    if not city:
        return ""
    return CITY_ALIASES.get(city, city)


def city_filter_variants(value):
    city = canonicalize_city(value)
    if not city:
        return []

    variants = {city}
    for alias, canonical in CITY_ALIASES.items():
        if canonical == city:
            variants.add(alias)
    return sorted(variants)
