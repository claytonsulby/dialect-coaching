import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import type { SpeakerSample, Tag } from "../types";
import SampleCard from "../components/SampleCard";
import TagInput from "../components/TagInput";

export default function SampleLibrary() {
  const [samples, setSamples] = useState<SpeakerSample[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState<number>(0);
  const [curatedOnly, setCuratedOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState("");

  // New sample form
  const [showForm, setShowForm] = useState(false);
  const [formSpeakerId, setFormSpeakerId] = useState("");
  const [formAudioId, setFormAudioId] = useState("");
  const [formAccentProfileId, setFormAccentProfileId] = useState("");
  const [formRating, setFormRating] = useState(0);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (minRating > 0) params.min_rating = String(minRating);
      if (curatedOnly) params.is_curated = "true";
      if (tagFilter) params.tag = tagFilter;
      const [s, t] = await Promise.all([api.samples.list(params), api.tags.list()]);
      setSamples(s);
      setTags(t);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [minRating, curatedOnly, tagFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = samples.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = s.speaker_name.toLowerCase().includes(q);
      const accentMatch = s.accent_profile_name?.toLowerCase().includes(q);
      if (!nameMatch && !accentMatch) return false;
    }
    return true;
  });

  const resetForm = () => {
    setFormSpeakerId("");
    setFormAudioId("");
    setFormAccentProfileId("");
    setFormRating(0);
    setFormTags([]);
    setFormNotes("");
    setFormError("");
  };

  const createSample = async () => {
    setFormError("");
    if (!formSpeakerId || !formAudioId) {
      setFormError("Speaker ID and Audio Resource ID are required.");
      return;
    }
    try {
      await api.samples.create({
        speaker_id: Number(formSpeakerId),
        audio_resource_id: Number(formAudioId),
        accent_profile_id: formAccentProfileId ? Number(formAccentProfileId) : null,
        quality_rating: formRating > 0 ? formRating : null,
        tags: formTags,
        notes: formNotes,
      });
      resetForm();
      setShowForm(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create sample");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Sample Library</h2>
        <button
          onClick={() => { setShowForm(!showForm); resetForm(); }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
        >
          {showForm ? "Cancel" : "New Sample"}
        </button>
      </div>

      {/* New sample form */}
      {showForm && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Create Sample</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Speaker ID *</label>
              <input
                type="number"
                value={formSpeakerId}
                onChange={(e) => setFormSpeakerId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Audio Resource ID *</label>
              <input
                type="number"
                value={formAudioId}
                onChange={(e) => setFormAudioId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Accent Profile ID</label>
              <input
                type="number"
                value={formAccentProfileId}
                onChange={(e) => setFormAccentProfileId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Quality Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormRating(star === formRating ? 0 : star)}
                  className={`text-lg ${star <= formRating ? "text-yellow-400" : "text-gray-600"} hover:text-yellow-300 transition`}
                >
                  &#9733;
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tags</label>
            <TagInput value={formTags} onChange={setFormTags} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Optional notes..."
            />
          </div>
          {formError && <div className="text-sm text-red-400">{formError}</div>}
          <button
            onClick={createSample}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
          >
            Create
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-400 mb-1">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by speaker or accent..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Min Rating</label>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setMinRating(star === minRating ? 0 : star)}
                className={`text-lg ${star <= minRating ? "text-yellow-400" : "text-gray-600"} hover:text-yellow-300 transition`}
              >
                &#9733;
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={curatedOnly}
              onChange={(e) => setCuratedOnly(e.target.checked)}
              className="rounded bg-gray-800 border-gray-700"
            />
            Curated only
          </label>
        </div>
        <div className="min-w-[150px]">
          <label className="block text-xs text-gray-400 mb-1">Tag Filter</label>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name} ({t.sample_count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-gray-500 italic">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 italic">No samples found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <SampleCard key={s.id} sample={s} />
          ))}
        </div>
      )}
    </div>
  );
}
