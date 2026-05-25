import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Speaker } from "../types";

const AGE_RANGES = ["18-25", "26-35", "36-50", "51-65", "65+"];
const SOURCE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "local", label: "Local" },
  { value: "idea", label: "IDEA" },
  { value: "speech_accent_archive", label: "Speech Accent Archive" },
  { value: "csv", label: "CSV Import" },
];

const EMPTY_FORM = {
  name: "",
  origin_region_id: "",
  age_range: "",
  gender: "",
  ethnicity: "",
  socioeconomic_status: "",
  notes: "",
  source: "local",
};

export default function SpeakerList() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterAgeRange, setFilterAgeRange] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (filterGender) params.gender = filterGender;
    if (filterAgeRange) params.age_range = filterAgeRange;
    if (filterSource) params.source = filterSource;
    const data = await api.speakers.list(
      Object.keys(params).length > 0 ? params : undefined,
    );
    setSpeakers(data);
  }, [search, filterGender, filterAgeRange, filterSource]);

  useEffect(() => {
    load();
  }, [load]);

  const createSpeaker = async () => {
    if (!form.name.trim()) return;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      notes: form.notes,
      source: form.source,
    };
    if (form.origin_region_id)
      payload.origin_region_id = Number(form.origin_region_id);
    if (form.age_range) payload.age_range = form.age_range;
    if (form.gender) payload.gender = form.gender;
    if (form.ethnicity) payload.ethnicity = form.ethnicity;
    if (form.socioeconomic_status)
      payload.socioeconomic_status = form.socioeconomic_status;
    await api.speakers.create(payload);
    setForm({ ...EMPTY_FORM });
    setShowNew(false);
    load();
  };

  const sourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      local: "bg-green-900 text-green-300",
      idea: "bg-purple-900 text-purple-300",
      speech_accent_archive: "bg-yellow-900 text-yellow-300",
      csv: "bg-blue-900 text-blue-300",
    };
    const labels: Record<string, string> = {
      local: "Local",
      idea: "IDEA",
      speech_accent_archive: "SAA",
      csv: "CSV",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${colors[source] || "bg-gray-700 text-gray-300"}`}
      >
        {labels[source] || source}
      </span>
    );
  };

  const selectClass =
    "px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none";
  const inputClass =
    "px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Speakers</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
        >
          New Speaker
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className={`flex-1 min-w-[200px] ${inputClass}`}
        />
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className={selectClass}
        >
          <option value="">Any Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="non-binary">Non-binary</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filterAgeRange}
          onChange={(e) => setFilterAgeRange(e.target.value)}
          className={selectClass}
        >
          <option value="">Any Age</option>
          {AGE_RANGES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className={selectClass}
        >
          {SOURCE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* New Speaker Form */}
      {showNew && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">New Speaker</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name *"
              className={inputClass}
              autoFocus
            />
            <input
              value={form.origin_region_id}
              onChange={(e) =>
                setForm({ ...form, origin_region_id: e.target.value })
              }
              placeholder="Region ID"
              type="number"
              className={inputClass}
            />
            <select
              value={form.age_range}
              onChange={(e) => setForm({ ...form, age_range: e.target.value })}
              className={selectClass}
            >
              <option value="">Age Range</option>
              {AGE_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              placeholder="Gender"
              className={inputClass}
            />
            <input
              value={form.ethnicity}
              onChange={(e) => setForm({ ...form, ethnicity: e.target.value })}
              placeholder="Ethnicity"
              className={inputClass}
            />
            <select
              value={form.socioeconomic_status}
              onChange={(e) =>
                setForm({ ...form, socioeconomic_status: e.target.value })
              }
              className={selectClass}
            >
              <option value="">Socioeconomic Status</option>
              <option value="working">Working</option>
              <option value="middle">Middle</option>
              <option value="upper-middle">Upper-Middle</option>
              <option value="upper">Upper</option>
            </select>
          </div>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes"
            rows={2}
            className={`w-full ${inputClass}`}
          />
          <div className="flex gap-2">
            <button
              onClick={createSpeaker}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNew(false);
                setForm({ ...EMPTY_FORM });
              }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Speaker Grid */}
      {speakers.length === 0 ? (
        <p className="text-gray-500 italic">No speakers found.</p>
      ) : (
        <div className="grid gap-3">
          {speakers.map((s) => (
            <Link
              key={s.id}
              to={`/speakers/${s.id}`}
              className="block p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{s.name}</span>
                {sourceBadge(s.source)}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                {s.gender && <span>{s.gender}</span>}
                {s.age_range && <span>{s.age_range}</span>}
                {s.origin_region_id && (
                  <span>Region #{s.origin_region_id}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
