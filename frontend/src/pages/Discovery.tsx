import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import FacetSidebar from "../components/FacetSidebar";
import SearchResults from "../components/SearchResults";
import type { DiscoveryResult, DiscoveryStats } from "../types";

const TABS = [
  { key: "all", label: "All" },
  { key: "speaker", label: "Speakers" },
  { key: "sample", label: "Samples" },
  { key: "profile", label: "Profiles" },
] as const;

const FILTER_KEYS = [
  "q",
  "region_id",
  "gender",
  "age_range",
  "min_strength",
  "max_strength",
  "accent_profile_id",
  "tag",
  "source",
  "is_curated",
  "project_id",
  "actor_id",
  "entity_type",
];

export default function Discovery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<DiscoveryResult>({
    speakers: [],
    samples: [],
    profiles: [],
    total_count: 0,
  });
  const [stats, setStats] = useState<DiscoveryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const activeTab = searchParams.get("entity_type") || "all";
  const queryText = searchParams.get("q") || "";

  // Build current filters from search params (excluding empty values)
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const val = searchParams.get(key);
    if (val) filters[key] = val;
  }

  const doSearch = useCallback(
    async (params: Record<string, string>) => {
      setLoading(true);
      try {
        const data = await api.discovery.search(params);
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load stats once
  useEffect(() => {
    api.discovery.stats().then(setStats).catch(console.error);
  }, []);

  // Search whenever URL params change
  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (val) params[key] = val;
    });
    doSearch(params);
  }, [searchParams, doSearch]);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const handleFilterChange = useCallback(
    (key: string, value: string | null) => {
      updateParam(key, value);
    },
    [updateParam]
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      updateParam("entity_type", tab === "all" ? null : tab);
    },
    [updateParam]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      // Debounce text input
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParam("q", value || null);
      }, 300);
    },
    [updateParam]
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          <FacetSidebar filters={filters} onChange={handleFilterChange} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search bar */}
          <input
            type="text"
            defaultValue={queryText}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search speakers, samples, profiles..."
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-gray-800">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "border-b-2 border-blue-500 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">Searching...</p>
            </div>
          ) : (
            <SearchResults results={results} activeTab={activeTab} />
          )}

          {/* Stats */}
          {stats && (
            <div className="flex gap-6 pt-4 border-t border-gray-800 text-xs text-gray-600">
              <span>{stats.total_speakers} speakers</span>
              <span>{stats.total_samples} samples</span>
              <span>{stats.total_profiles} profiles</span>
              <span>{stats.total_regions} regions</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
