import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../api/client";
import type { RegionSearchResult } from "../types";

function pathBreadcrumb(path: string): string {
  return path.split("/").join(" > ");
}

interface RegionPickerProps {
  value: number | null;
  onChange: (regionId: number | null) => void;
}

export default function RegionPicker({ value, onChange }: RegionPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegionSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load the name for the initially selected value
  useEffect(() => {
    if (value === null) {
      setSelectedLabel("");
      return;
    }
    api.regions.get(value).then((r) => {
      setSelectedLabel(`${r.name} (${pathBreadcrumb(r.path)})`);
    }).catch(() => {
      setSelectedLabel("");
    });
  }, [value]);

  // Search as user types
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.regions.search(query.trim());
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  // Close dropdown on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const select = (r: RegionSearchResult) => {
    onChange(r.id);
    setSelectedLabel(`${r.name} (${pathBreadcrumb(r.path)})`);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setSelectedLabel("");
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-1">
        <input
          value={open ? query : selectedLabel || query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search for a region..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
        />
        {value !== null && (
          <button
            onClick={clear}
            className="px-2 py-2 text-gray-400 hover:text-gray-200 text-sm transition"
            title="Clear selection"
          >
            x
          </button>
        )}
      </div>

      {open && (query.trim() || results.length > 0) && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-400">Searching...</div>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <div className="px-3 py-2 text-sm text-gray-500 italic">No results</div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => select(r)}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 transition"
            >
              <div className="text-sm font-medium text-white">{r.name}</div>
              <div className="text-xs text-gray-400">{pathBreadcrumb(r.path)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
