import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { AccentProfile, AccentComparison, SpeakerSample } from "../types";
import PatternTable from "../components/PatternTable";
import AudioLink from "../components/AudioLink";

export default function AccentProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AccentProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<AccentProfile[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [comparison, setComparison] = useState<AccentComparison | null>(null);
  const [compareToId, setCompareToId] = useState<string>("");
  const [samples, setSamples] = useState<SpeakerSample[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.accentProfiles.get(Number(id));
      setProfile(data);
      setEditName(data.name);
      setEditDesc(data.description);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.accentProfiles.list().then(setAllProfiles);
    if (id) {
      api.samples.list({ accent_profile_id: String(id) }).then(setSamples);
    }
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    await api.accentProfiles.update(Number(id), {
      name: editName,
      description: editDesc,
    });
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!id || !confirm("Delete this accent profile?")) return;
    await api.accentProfiles.delete(Number(id));
    navigate("/accent-profiles");
  };

  const handleAggregate = async () => {
    if (!id) return;
    await api.accentProfiles.aggregate(Number(id));
    load();
  };

  const handleCompare = async () => {
    if (!id || !compareToId) return;
    const data = await api.accentProfiles.compare(
      Number(id),
      Number(compareToId)
    );
    setComparison(data);
  };

  const handleAddPattern = async (data: {
    expected_phone: string;
    actual_phone: string;
    frequency: number;
    notes: string;
  }) => {
    if (!id) return;
    await api.accentProfiles.addPattern(Number(id), data);
    load();
  };

  const handleUpdatePattern = async (
    patternId: number,
    data: {
      expected_phone?: string;
      actual_phone?: string;
      frequency?: number;
      notes?: string;
    }
  ) => {
    if (!id) return;
    await api.accentProfiles.updatePattern(Number(id), patternId, data);
    load();
  };

  const handleDeletePattern = async (patternId: number) => {
    if (!id) return;
    await api.accentProfiles.deletePattern(Number(id), patternId);
    load();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-400 text-sm">Profile not found.</p>
      </div>
    );
  }

  const otherProfiles = allProfiles.filter((p) => p.id !== profile.id);

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/accent-profiles")}
        className="text-sm text-gray-400 hover:text-gray-200 transition mb-4 inline-block"
      >
        &larr; Back to Profiles
      </button>

      {/* Profile Metadata */}
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg mb-6">
        {editing ? (
          <div className="space-y-3">
            <input
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <textarea
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{profile.name}</h1>
                  {profile.source !== "manual" && (
                    <span className="px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 border border-emerald-700 rounded text-xs font-medium">
                      {profile.source}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  {profile.description || "No description"}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Source: {profile.source}</span>
                  <span>Samples: {profile.sample_count}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Signature Patterns */}
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Signature Patterns</h2>
          <button
            onClick={handleAggregate}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
          >
            Aggregate from Samples
          </button>
        </div>
        {profile.patterns.length === 0 ? (
          <p className="text-gray-400 text-sm mb-3">
            No patterns defined yet. Add patterns to build this accent's
            signature.
          </p>
        ) : null}
        <PatternTable
          patterns={profile.patterns}
          onAdd={handleAddPattern}
          onUpdate={handleUpdatePattern}
          onDelete={handleDeletePattern}
        />
      </div>

      {/* Samples */}
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Samples</h2>
        {samples.length === 0 ? (
          <p className="text-sm text-gray-500">No samples with this accent profile yet</p>
        ) : (
          <div className="space-y-2">
            {samples.map((s) => (
              <div
                key={s.id}
                className="bg-gray-800 rounded p-2 flex justify-between items-center"
              >
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-300">{s.speaker_name || `Speaker #${s.speaker_id}`}</span>
                  {s.quality_rating != null && (
                    <span className="text-gray-500">({s.quality_rating}/5)</span>
                  )}
                </div>
                <AudioLink audioResourceId={s.audio_resource_id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comparison */}
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Compare with...</h2>
        <div className="flex gap-2 mb-4">
          <select
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
            value={compareToId}
            onChange={(e) => {
              setCompareToId(e.target.value);
              setComparison(null);
            }}
          >
            <option value="">Select a profile...</option>
            {otherProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={!compareToId}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition"
          >
            Compare
          </button>
        </div>

        {comparison && (
          <div className="space-y-4">
            {comparison.shared_patterns.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">
                  Shared Patterns ({comparison.shared_patterns.length})
                </h3>
                <div className="space-y-1">
                  {comparison.shared_patterns.map((sp, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm py-1 border-b border-gray-800"
                    >
                      <span className="font-mono text-blue-300">
                        /{sp.expected_phone}/
                      </span>
                      <span className="text-gray-500">&rarr;</span>
                      <span className="font-mono text-amber-300">
                        [{sp.actual_phone}]
                      </span>
                      <span className="text-gray-500 text-xs">
                        A: {Math.round(sp.frequency_a * 100)}% | B:{" "}
                        {Math.round(sp.frequency_b * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {comparison.unique_to_a.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">
                  Unique to {comparison.profile_a.name} (
                  {comparison.unique_to_a.length})
                </h3>
                <div className="space-y-1">
                  {comparison.unique_to_a.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm py-1 border-b border-gray-800"
                    >
                      <span className="font-mono text-blue-300">
                        /{p.expected_phone}/
                      </span>
                      <span className="text-gray-500">&rarr;</span>
                      <span className="font-mono text-amber-300">
                        [{p.actual_phone}]
                      </span>
                      <span className="text-gray-400 text-xs">{p.notes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {comparison.unique_to_b.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">
                  Unique to {comparison.profile_b.name} (
                  {comparison.unique_to_b.length})
                </h3>
                <div className="space-y-1">
                  {comparison.unique_to_b.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm py-1 border-b border-gray-800"
                    >
                      <span className="font-mono text-blue-300">
                        /{p.expected_phone}/
                      </span>
                      <span className="text-gray-500">&rarr;</span>
                      <span className="font-mono text-amber-300">
                        [{p.actual_phone}]
                      </span>
                      <span className="text-gray-400 text-xs">{p.notes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
