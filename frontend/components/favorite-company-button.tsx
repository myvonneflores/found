"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { createFavorite, deleteFavorite, listFavorites } from "@/lib/api";

export function FavoriteCompanyButton({
  companyId,
}: {
  companyId: number;
}) {
  const { accessToken, isAuthenticated, isReady, user } = useAuth();
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const canUseFavorites = Boolean(user?.account_type === "personal" || user?.is_business_verified);

  useEffect(() => {
    async function loadFavorites() {
      if (!isReady) {
        return;
      }

      if (!isAuthenticated || !accessToken || !canUseFavorites) {
        setIsLoading(false);
        return;
      }

      try {
        const favorites = await listFavorites(accessToken);
        const match = favorites.find((favorite) => favorite.company.id === companyId);
        setFavoriteId(match?.id ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load favorites.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadFavorites();
  }, [accessToken, canUseFavorites, companyId, isAuthenticated, isReady]);

  async function toggleFavorite() {
    if (!accessToken) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (favoriteId) {
        await deleteFavorite(accessToken, favoriteId);
        setFavoriteId(null);
      } else {
        const favorite = await createFavorite(accessToken, companyId);
        setFavoriteId(favorite.id);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update favorite.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isReady) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="detail-community-action">
        <p className="muted">Log in to save this business to your FOUND favorites.</p>
        <Link className="button button-secondary" href="/login">
          Log in
        </Link>
      </div>
    );
  }

  if (!canUseFavorites) {
    return (
      <div className="detail-community-action">
        <p className="muted">Favorites unlock after your business account has been verified.</p>
      </div>
    );
  }

  return (
    <div className="detail-community-action">
      <button className="button button-primary" disabled={isLoading || isSaving} onClick={toggleFavorite} type="button">
        {favoriteId ? "Remove favorite" : isSaving ? "Saving..." : "Add to favorites"}
      </button>
      {error ? <p className="contact-form-note is-error">{error}</p> : null}
    </div>
  );
}
