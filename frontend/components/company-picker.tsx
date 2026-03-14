"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";

import { listCompanies } from "@/lib/api";
import { CompanyListItem } from "@/types/company";

export function CompanyPicker({
  label = "Business",
  onSelect,
  placeholder = "Search for a FOUND business",
  selectedCompany,
}: {
  label?: string;
  onSelect: (company: CompanyListItem | null) => void;
  placeholder?: string;
  selectedCompany: CompanyListItem | null;
}) {
  const [query, setQuery] = useState(selectedCompany?.name ?? "");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<CompanyListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setQuery(selectedCompany?.name ?? "");
  }, [selectedCompany]);

  useEffect(() => {
    let isCancelled = false;

    async function searchCompanies() {
      const normalized = deferredQuery.trim();

      if (!normalized || selectedCompany?.name === normalized) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const response = await listCompanies({ search: normalized });
        if (!isCancelled) {
          startTransition(() => {
            setResults(response.results.slice(0, 6));
          });
        }
      } catch {
        if (!isCancelled) {
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }

    void searchCompanies();

    return () => {
      isCancelled = true;
    };
  }, [deferredQuery, selectedCompany]);

  function selectCompany(company: CompanyListItem) {
    setQuery(company.name);
    setResults([]);
    onSelect(company);
  }

  return (
    <div className="company-picker">
      <label className="contact-field">
        <span className="contact-field-label">{label}</span>
        <input
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            onSelect(selectedCompany?.name === nextValue ? selectedCompany : null);
          }}
          placeholder={placeholder}
          required
          value={query}
        />
      </label>
      {selectedCompany ? (
        <div className="recommendation-selected-company">
          <span className="badge">{selectedCompany.name}</span>
          <button
            className="detail-list-switch"
            onClick={() => {
              setQuery("");
              onSelect(null);
            }}
            type="button"
          >
            Clear selection
          </button>
        </div>
      ) : null}
      {!selectedCompany && (isSearching || results.length > 0) ? (
        <div className="recommendation-search-results">
          {isSearching ? <p className="muted">Searching businesses...</p> : null}
          {!isSearching &&
            results.map((company) => (
              <button
                className="recommendation-search-result"
                key={company.id}
                onClick={() => selectCompany(company)}
                type="button"
              >
                <strong>{company.name}</strong>
                <span>{[company.city, company.state].filter(Boolean).join(", ") || "Location pending"}</span>
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
