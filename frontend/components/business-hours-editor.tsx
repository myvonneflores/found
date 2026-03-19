"use client";

import { useEffect } from "react";

import { cloneBusinessHours, createEmptyBusinessHours, WEEKDAYS, WEEKDAY_LABELS } from "@/lib/business-hours";
import type { BusinessHours, BusinessHoursInterval, Weekday } from "@/types/company";

function createEmptyInterval(): BusinessHoursInterval {
  return { start: "09:00", end: "17:00" };
}

function readBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export function BusinessHoursEditor({
  businessHours,
  timezone,
  onBusinessHoursChange,
  onTimezoneChange,
}: {
  businessHours: BusinessHours | null;
  timezone: string | null;
  onBusinessHoursChange: (value: BusinessHours | null) => void;
  onTimezoneChange: (value: string) => void;
}) {
  useEffect(() => {
    if (businessHours === null || timezone) {
      return;
    }

    const browserTimezone = readBrowserTimezone();
    if (browserTimezone) {
      onTimezoneChange(browserTimezone);
    }
  }, [businessHours, onTimezoneChange, timezone]);

  function enableHours() {
    onBusinessHoursChange(createEmptyBusinessHours());
    if (!timezone) {
      const browserTimezone = readBrowserTimezone();
      if (browserTimezone) {
        onTimezoneChange(browserTimezone);
      }
    }
  }

  function disableHours() {
    onBusinessHoursChange(null);
    onTimezoneChange("");
  }

  function updateDay(day: Weekday, updater: (intervals: BusinessHoursInterval[]) => BusinessHoursInterval[]) {
    const nextValue = cloneBusinessHours(businessHours) ?? createEmptyBusinessHours();
    nextValue.open_by_week[day] = updater(nextValue.open_by_week[day]);
    onBusinessHoursChange(nextValue);
  }

  function updateInterval(day: Weekday, index: number, key: keyof BusinessHoursInterval, value: string) {
    updateDay(day, (intervals) =>
      intervals.map((interval, intervalIndex) =>
        intervalIndex === index ? { ...interval, [key]: value } : interval
      )
    );
  }

  return (
    <section className="business-hours-editor">
      <div className="business-hours-editor-header">
        <div>
          <span className="contact-field-label">Business hours</span>
          <p className="business-hours-editor-note">Add your weekly recurring hours. Holiday and one-off date overrides can come later.</p>
        </div>
        {businessHours ? (
          <button className="business-hours-action business-hours-action-secondary" onClick={disableHours} type="button">
            Clear hours
          </button>
        ) : (
          <button className="business-hours-action" onClick={enableHours} type="button">
            Add business hours
          </button>
        )}
      </div>

      {businessHours ? (
        <div className="business-hours-editor-body">
          <label className="contact-field business-hours-timezone-field">
            <span className="contact-field-label">Timezone</span>
            <input
              onChange={(event) => onTimezoneChange(event.target.value)}
              placeholder="America/Los_Angeles"
              value={timezone ?? ""}
            />
          </label>

          <div className="business-hours-grid">
            {WEEKDAYS.map((day) => {
              const intervals = businessHours.open_by_week[day];
              const isClosed = intervals.length === 0;

              return (
                <div className="business-hours-day-row" key={day}>
                  <div className="business-hours-day-label">
                    <strong>{WEEKDAY_LABELS[day]}</strong>
                    <button
                      className="business-hours-inline-button"
                      onClick={() => updateDay(day, () => (isClosed ? [createEmptyInterval()] : []))}
                      type="button"
                    >
                      {isClosed ? "Open" : "Closed"}
                    </button>
                  </div>

                  {isClosed ? (
                    <p className="muted business-hours-closed-copy">Closed</p>
                  ) : (
                    <div className="business-hours-interval-list">
                      {intervals.map((interval, index) => (
                        <div className="business-hours-interval-row" key={`${day}-${index}`}>
                          <label className="contact-field">
                            <span className="contact-field-label">Open</span>
                            <input
                              onChange={(event) => updateInterval(day, index, "start", event.target.value)}
                              step={60}
                              type="time"
                              value={interval.start}
                            />
                          </label>

                          <label className="contact-field">
                            <span className="contact-field-label">Close</span>
                            <input
                              onChange={(event) => updateInterval(day, index, "end", event.target.value)}
                              step={60}
                              type="time"
                              value={interval.end}
                            />
                          </label>

                          <button
                            aria-label={`Remove ${WEEKDAY_LABELS[day]} interval ${index + 1}`}
                            className="business-hours-inline-button"
                            onClick={() =>
                              updateDay(day, (currentIntervals) =>
                                currentIntervals.filter((_, intervalIndex) => intervalIndex !== index)
                              )
                            }
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      {intervals.length < 3 ? (
                        <button
                          className="business-hours-inline-button"
                          onClick={() => updateDay(day, (currentIntervals) => [...currentIntervals, createEmptyInterval()])}
                          type="button"
                        >
                          Add interval
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="contact-form-note">Hours not listed yet. Add them when you're ready.</p>
      )}
    </section>
  );
}
