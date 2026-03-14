"use client";

import Link from "next/link";
import { type Dispatch, type FormEvent, type SetStateAction, useState } from "react";

import { CompanyPicker } from "@/components/company-picker";
import { createRecommendation, deleteRecommendation, updateRecommendation } from "@/lib/api";
import { CompanyListItem } from "@/types/company";
import { Recommendation } from "@/types/recommendation";

export function RecommendationManager({
  accessToken,
  recommendations,
  setRecommendations,
}: {
  accessToken: string | null;
  recommendations: Recommendation[];
  setRecommendations: Dispatch<SetStateAction<Recommendation[]>>;
}) {
  const [form, setForm] = useState({
    selectedCompany: null as CompanyListItem | null,
    title: "",
    body: "",
    isPublic: true,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError("Please log in again before creating a recommendation.");
      return;
    }

    if (!form.selectedCompany) {
      setError("Choose a business before publishing a recommendation.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const recommendation = await createRecommendation(accessToken, {
        company_id: form.selectedCompany.id,
        title: form.title,
        body: form.body,
        is_public: form.isPublic,
      });
      setRecommendations((current) => [recommendation, ...current]);
      setForm({
        selectedCompany: null,
        title: "",
        body: "",
        isPublic: true,
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create recommendation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(recommendationId: number) {
    if (!accessToken) {
      return;
    }

    setPendingId(recommendationId);
    setError("");

    try {
      await deleteRecommendation(accessToken, recommendationId);
      setRecommendations((current) => current.filter((recommendation) => recommendation.id !== recommendationId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete recommendation.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleBlur(
    recommendationId: number,
    current: Recommendation,
    updates: { title?: string; body?: string; is_public?: boolean }
  ) {
    if (!accessToken) {
      return;
    }

    setPendingId(recommendationId);
    setError("");

    try {
      const next = await updateRecommendation(accessToken, recommendationId, updates);
      setRecommendations((existing) =>
        existing.map((recommendation) => (recommendation.id === recommendationId ? next : recommendation))
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update recommendation.");
      setRecommendations((existing) =>
        existing.map((recommendation) => (recommendation.id === recommendationId ? current : recommendation))
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="recommendation-manager">
      <form className="auth-form" onSubmit={handleCreate}>
        <CompanyPicker
          label="Business"
          onSelect={(company) => {
            setForm((current) => ({ ...current, selectedCompany: company }));
            setError("");
          }}
          selectedCompany={form.selectedCompany}
        />
        <label className="contact-field">
          <span className="contact-field-label">Headline</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
            value={form.title}
          />
        </label>
        <label className="contact-field">
          <span className="contact-field-label">Recommendation</span>
          <textarea
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            required
            rows={4}
            value={form.body}
          />
        </label>
        <label className="auth-checkbox">
          <input
            checked={form.isPublic}
            onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))}
            type="checkbox"
          />
          <span>Publish this recommendation on my public profile</span>
        </label>
        <button className="contact-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Publishing..." : "Create recommendation"}
        </button>
      </form>

      <div className="recommendation-list">
        {recommendations.length === 0 ? <p className="lede">No recommendations yet. Share one to shape your public voice.</p> : null}
        {recommendations.map((recommendation) => (
          <div className="recommendation-card" key={recommendation.id}>
            <div className="recommendation-card-top">
              <div>
                <strong>{recommendation.company.name}</strong>
                <p>{[recommendation.company.city, recommendation.company.state].filter(Boolean).join(", ") || "Location pending"}</p>
              </div>
              <div className="list-manager-header-actions">
                <span className={`badge ${recommendation.is_public ? "" : "badge-outline"}`}>
                  {recommendation.is_public ? "Public" : "Private"}
                </span>
                <Link className="auth-text-link" href={`/companies/${recommendation.company.slug}`}>
                  View business
                </Link>
              </div>
            </div>
            <label className="detail-list-field">
              <span className="field-label">Headline</span>
              <input
                defaultValue={recommendation.title}
                onBlur={(event) => {
                  if (event.target.value !== recommendation.title) {
                    void handleBlur(recommendation.id, recommendation, { title: event.target.value });
                  }
                }}
              />
            </label>
            <label className="detail-list-field">
              <span className="field-label">Body</span>
              <textarea
                defaultValue={recommendation.body}
                onBlur={(event) => {
                  if (event.target.value !== recommendation.body) {
                    void handleBlur(recommendation.id, recommendation, { body: event.target.value });
                  }
                }}
                rows={4}
              />
            </label>
            <label className="auth-checkbox">
              <input
                checked={recommendation.is_public}
                onChange={(event) => {
                  setRecommendations((current) =>
                    current.map((item) =>
                      item.id === recommendation.id ? { ...item, is_public: event.target.checked } : item
                    )
                  );
                  void handleBlur(recommendation.id, recommendation, { is_public: event.target.checked });
                }}
                type="checkbox"
              />
              <span>Show on public profile</span>
            </label>
            <div className="list-manager-actions">
              <button
                className="button button-secondary"
                disabled={pendingId === recommendation.id}
                onClick={() => void handleDelete(recommendation.id)}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {error ? <p className="contact-form-note is-error">{error}</p> : null}
    </div>
  );
}
