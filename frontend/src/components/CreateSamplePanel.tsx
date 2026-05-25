import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import type { Speaker, AccentProfile } from "../types";

interface Props {
  audioResourceId: number;
  projectId: number | null;
  onCreated: () => void;
  onCancel: () => void;
}

export default function CreateSamplePanel({
  audioResourceId,
  projectId,
  onCreated,
  onCancel,
}: Props) {
  const [speakerQuery, setSpeakerQuery] = useState("");
  const [speakerResults, setSpeakerResults] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [accentProfiles, setAccentProfiles] = useState<AccentProfile[]>([]);
  const [accentProfileId, setAccentProfileId] = useState<number | null>(null);

  const [quality, setQuality] = useState<number>(0);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.accentProfiles.list().then(setAccentProfiles).catch(() => {});
  }, []);

  const searchSpeakers = useCallback((text: string) => {
    clearTimeout(searchTimeout.current);
    if (!text.trim()) {
      setSpeakerResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await api.speakers.list({ q: text });
        setSpeakerResults(results);
        setShowDropdown(true);
      } catch {
        setSpeakerResults([]);
      }
    }, 250);
  }, []);

  const handleSpeakerInput = (value: string) => {
    setSpeakerQuery(value);
    setSelectedSpeaker(null);
    searchSpeakers(value);
  };

  const selectSpeaker = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setSpeakerQuery(speaker.name);
    setShowDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = async () => {
    if (!selectedSpeaker) {
      setError("Please select a speaker");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.samples.create({
        speaker_id: selectedSpeaker.id,
        audio_resource_id: audioResourceId,
        accent_profile_id: accentProfileId,
        quality_rating: quality > 0 ? quality : null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes,
      });
      onCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create sample");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Create Sample</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Pre-filled info */}
        <div className="col-span-2 flex gap-4 text-xs text-gray-500">
          <span>Audio Resource: #{audioResourceId}</span>
          {projectId && <span>Project: #{projectId}</span>}
        </div>

        {/* Speaker search */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs text-gray-400 mb-1">Speaker</label>
          <input
            type="text"
            value={speakerQuery}
            onChange={(e) => handleSpeakerInput(e.target.value)}
            placeholder="Search speakers..."
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 text-sm"
          />
          {showDropdown && speakerResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
              {speakerResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSpeaker(s)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm text-gray-200"
                >
                  <span className="font-medium">{s.name}</span>
                  {s.gender && (
                    <span className="ml-2 text-gray-500">{s.gender}</span>
                  )}
                  {s.origin_region_name && (
                    <span className="ml-2 text-gray-500">
                      {s.origin_region_name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {showDropdown && speakerResults.length === 0 && speakerQuery.trim() && (
            <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg px-3 py-2 text-sm text-gray-500">
              No speakers found
            </div>
          )}
        </div>

        {/* Accent profile */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Accent Profile
          </label>
          <select
            value={accentProfileId ?? ""}
            onChange={(e) =>
              setAccentProfileId(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 text-sm"
          >
            <option value="">None</option>
            {accentProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quality rating */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Quality Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setQuality(quality === star ? 0 : star)}
                className={`text-lg ${
                  star <= quality ? "text-yellow-400" : "text-gray-600"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. native, clear, formal"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 text-sm"
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 text-sm resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedSpeaker}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded text-sm font-medium transition"
        >
          {submitting ? "Creating..." : "Create Sample"}
        </button>
      </div>
    </div>
  );
}
