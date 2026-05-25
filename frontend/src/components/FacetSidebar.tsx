import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Props {
  filters: Record<string, string>;
  onChange: (key: string, value: string | null) => void;
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-800 pb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-300 py-1"
      >
        {title}
        <span className="text-gray-600 text-xs">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
}

const GENDERS = ["Male", "Female", "Non-binary", "Other"];
const AGE_RANGES = ["18-25", "26-35", "36-50", "51-65", "65+"];
const SOURCES = ["local", "IDEA", "Speech Accent Archive"];

export default function FacetSidebar({ filters, onChange }: Props) {
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [actors, setActors] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    api.projects.list().then(setProjects).catch(console.error);
    api.actors.list().then(setActors).catch(console.error);
  }, []);

  const clearAll = () => {
    for (const key of Object.keys(filters)) {
      onChange(key, null);
    }
  };

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-300 transition"
          >
            Clear All
          </button>
        )}
      </div>

      <Section title="Project">
        <select
          value={filters.project_id || ""}
          onChange={(e) => onChange("project_id", e.target.value || null)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Actor">
        <select
          value={filters.actor_id || ""}
          onChange={(e) => onChange("actor_id", e.target.value || null)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Actors</option>
          {actors.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.name}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Region">
        <input
          type="number"
          placeholder="Region ID..."
          value={filters.region_id || ""}
          onChange={(e) =>
            onChange("region_id", e.target.value || null)
          }
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
        />
      </Section>

      <Section title="Gender">
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="radio"
              name="gender"
              checked={!filters.gender}
              onChange={() => onChange("gender", null)}
              className="accent-blue-500"
            />
            Any
          </label>
          {GENDERS.map((g) => (
            <label key={g} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="radio"
                name="gender"
                checked={filters.gender === g}
                onChange={() => onChange("gender", g)}
                className="accent-blue-500"
              />
              {g}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Age Range">
        <div className="space-y-1">
          {AGE_RANGES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.age_range === r}
                onChange={(e) => onChange("age_range", e.target.checked ? r : null)}
                className="accent-blue-500 rounded"
              />
              {r}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Accent Strength" defaultOpen={false}>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            max="100"
            placeholder="Min"
            value={filters.min_strength || ""}
            onChange={(e) => onChange("min_strength", e.target.value || null)}
            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
          />
          <span className="text-gray-600 text-xs">to</span>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="Max"
            value={filters.max_strength || ""}
            onChange={(e) => onChange("max_strength", e.target.value || null)}
            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </Section>

      <Section title="Source" defaultOpen={false}>
        <div className="space-y-1">
          {SOURCES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.source === s}
                onChange={(e) => onChange("source", e.target.checked ? s : null)}
                className="accent-blue-500 rounded"
              />
              {s}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Curated Only" defaultOpen={false}>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <button
            onClick={() =>
              onChange("is_curated", filters.is_curated ? null : "true")
            }
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
              filters.is_curated ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                filters.is_curated ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
          Show curated only
        </label>
      </Section>
    </div>
  );
}
