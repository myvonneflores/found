import pytest
from rest_framework import serializers

from companies.business_hours import validate_business_hours


def build_business_hours():
    return {
        "open_by_week": {
            "monday": [{"start": "08:00", "end": "18:00"}],
            "tuesday": [{"start": "08:00", "end": "18:00"}],
            "wednesday": [{"start": "08:00", "end": "18:00"}],
            "thursday": [{"start": "08:00", "end": "18:00"}],
            "friday": [{"start": "08:00", "end": "18:00"}],
            "saturday": [{"start": "09:00", "end": "14:00"}],
            "sunday": [],
        },
        "open_by_date": {},
    }


def test_accepts_valid_weekly_hours_with_multiple_intervals():
    business_hours = build_business_hours()
    business_hours["open_by_week"]["monday"] = [
        {"start": "08:00", "end": "12:00"},
        {"start": "13:00", "end": "18:00"},
    ]

    normalized = validate_business_hours(business_hours, "America/Los_Angeles")

    assert normalized["open_by_week"]["monday"][1] == {"start": "13:00", "end": "18:00"}


def test_accepts_valid_open_by_date_data():
    business_hours = build_business_hours()
    business_hours["open_by_date"] = {
        "2026-12-24": [{"start": "09:00", "end": "13:00"}],
        "2026-12-25": [],
    }

    normalized = validate_business_hours(business_hours, "America/Los_Angeles")

    assert set(normalized["open_by_date"].keys()) == {"2026-12-24", "2026-12-25"}


@pytest.mark.parametrize(
    "mutator",
    [
        lambda payload: payload["open_by_week"].pop("monday"),
        lambda payload: payload.update({"unexpected": {}}),
        lambda payload: payload["open_by_week"]["monday"].append({"start": "nope", "end": "18:00"}),
        lambda payload: payload["open_by_week"]["monday"].append({"start": "18:00", "end": "18:00"}),
        lambda payload: payload["open_by_week"].__setitem__(
            "monday",
            [{"start": "08:00", "end": "12:00"}, {"start": "11:00", "end": "18:00"}],
        ),
        lambda payload: payload["open_by_week"].__setitem__(
            "monday",
            [
                {"start": "08:00", "end": "09:00"},
                {"start": "10:00", "end": "11:00"},
                {"start": "12:00", "end": "13:00"},
                {"start": "14:00", "end": "15:00"},
            ],
        ),
        lambda payload: payload["open_by_date"].update({"not-a-date": []}),
        lambda payload: payload["open_by_date"].update(
            {f"2027-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2028-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2029-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2030-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2031-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2032-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2033-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2034-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2035-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2036-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2037-01-{index:02d}": [] for index in range(1, 32)}
            | {f"2038-01-{index:02d}": [] for index in range(1, 27)}
        ),
        lambda payload: payload["open_by_week"].__setitem__("monday", [{"start": "22:00", "end": "02:00"}]),
    ],
)
def test_rejects_invalid_business_hours_shapes(mutator):
    business_hours = build_business_hours()
    mutator(business_hours)

    with pytest.raises(serializers.ValidationError):
        validate_business_hours(business_hours, "America/Los_Angeles")


def test_rejects_invalid_timezone():
    with pytest.raises(serializers.ValidationError):
        validate_business_hours(build_business_hours(), "Mars/Olympus")


def test_accepts_split_overnight_representation():
    business_hours = build_business_hours()
    business_hours["open_by_week"]["monday"] = [{"start": "22:00", "end": "23:59"}]
    business_hours["open_by_week"]["tuesday"] = [{"start": "00:00", "end": "02:00"}]

    normalized = validate_business_hours(business_hours, "America/Los_Angeles")

    assert normalized["open_by_week"]["monday"] == [{"start": "22:00", "end": "23:59"}]
    assert normalized["open_by_week"]["tuesday"] == [{"start": "00:00", "end": "02:00"}]


def test_rejects_more_than_three_override_intervals_for_one_date():
    business_hours = build_business_hours()
    business_hours["open_by_date"] = {
        "2026-12-24": [
            {"start": "08:00", "end": "09:00"},
            {"start": "10:00", "end": "11:00"},
            {"start": "12:00", "end": "13:00"},
            {"start": "14:00", "end": "15:00"},
        ]
    }

    with pytest.raises(serializers.ValidationError):
        validate_business_hours(business_hours, "America/Los_Angeles")
