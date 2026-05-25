import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import type { Speaker, SpeakerSample } from "../types";
import AudioLink from "../components/AudioLink";

const AGE_RANGES = ["18-25", "26-35", "36-50", "51-65", "65+"];

export default function SpeakerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [editing, setEditing] = useState(false);
  const [samples, setSamples] = useState<SpeakerSample[]>([]);
  const [form, setForm] = useState({
    name: "",
    origin_region_id: "",
    age_range: "",
    gender: "",
    ethnicity: "",
    socioeconomic_status: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!id) return;
    const data = await api.speakers.get(Number(id));
    setSpeaker(data);
    setForm({
      name: data.name,
      origin_region_id: data.origin_region_id?.toString() || "",
      age_range: data.age_range || "",
      gender: data.gender || "",
      ethnicity: data.ethnicity || "",
      socioeconomic_status: data.socioeconomic_status || "",
      notes: data.notes || "",
    });
  }, [id]);

  useEffect(() => {
    load();
    if (id) {
      api.samples.list({ speaker_id: String(id) }).then(setSamples);
    }
  }, [load, id]);

  const save = async () => {
    if (!id || !form.name.trim()) return;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      notes: form.notes,
      origin_region_id: form.origin_region_id
        ? Number(form.origin_region_id)
        : null,
      age_range: form.age_range || null,
      gender: form.gender || null,
      ethnicity: form.ethnicity || null,
      socioeconomic_status: form.socioeconomic_status || null,
    };
    await api.speakers.update(Number(id), payload);
    setEditing(false);
    load();
  };

  const deleteSpeaker = async () => {
    if (!id) return;
    if (!confirm("Delete this speaker?")) return;
    await api.speakers.delete(Number(id));
    navigate("/speakers");
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
      speech_accent_archive: "Speech Accent Archive",
      csv: "CSV Import",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${colors[source] || "bg-gray-700 text-gray-300"}`}
      >
        {labels[source] || source}
      </span>
    );
  };

  if (!speaker) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const inputClass =
    "px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-full";
  const selectClass =
    "px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-full";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/speakers"
          className="text-sm text-gray-400 hover:text-gray-200 transition"
        >
          &larr; Speakers
        </Link>
      </div>

      <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {editing ? "Edit Speaker" : speaker.name}
          </h2>
          <div className="flex items-center gap-2">
            {sourceBadge(speaker.source)}
            {speaker.external_id && (
              <span className="text-xs text-gray-500">
                ext: {speaker.external_id}
              </span>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Origin Region ID</label>
                <input
                  value={form.origin_region_id}
                  onChange={(e) =>
                    setForm({ ...form, origin_region_id: e.target.value })
                  }
                  type="number"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Age Range</label>
                <select
                  value={form.age_range}
                  onChange={(e) =>
                    setForm({ ...form, age_range: e.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">--</option>
                  {AGE_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <input
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Ethnicity</label>
                <input
                  value={form.ethnicity}
                  onChange={(e) =>
                    setForm({ ...form, ethnicity: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Socioeconomic Status</label>
                <select
                  value={form.socioeconomic_status}
                  onChange={(e) =>
                    setForm({ ...form, socioeconomic_status: e.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">--</option>
                  <option value="working">Working</option>
                  <option value="middle">Middle</option>
                  <option value="upper-middle">Upper-Middle</option>
                  <option value="upper">Upper</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={save}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  load();
                }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={labelClass}>Origin Region</span>
                <p className="text-sm text-white">
                  {speaker.origin_region_id
                    ? `Region #${speaker.origin_region_id}`
                    : "--"}
                </p>
              </div>
              <div>
                <span className={labelClass}>Age Range</span>
                <p className="text-sm text-white">
                  {speaker.age_range || "--"}
                </p>
              </div>
              <div>
                <span className={labelClass}>Gender</span>
                <p className="text-sm text-white">{speaker.gender || "--"}</p>
              </div>
              <div>
                <span className={labelClass}>Ethnicity</span>
                <p className="text-sm text-white">
                  {speaker.ethnicity || "--"}
                </p>
              </div>
              <div>
                <span className={labelClass}>Socioeconomic Status</span>
                <p className="text-sm text-white">
                  {speaker.socioeconomic_status || "--"}
                </p>
              </div>
              <div>
                <span className={labelClass}>Created</span>
                <p className="text-sm text-white">
                  {new Date(speaker.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {speaker.notes && (
              <div>
                <span className={labelClass}>Notes</span>
                <p className="text-sm text-white whitespace-pre-wrap">
                  {speaker.notes}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
              >
                Edit
              </button>
              <button
                onClick={deleteSpeaker}
                className="px-3 py-1.5 bg-red-800 hover:bg-red-700 rounded text-sm font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Samples */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Samples</h3>
        {samples.length === 0 ? (
          <p className="text-sm text-gray-500">No samples for this speaker yet</p>
        ) : (
          <div className="space-y-2">
            {samples.map((s) => (
              <div
                key={s.id}
                className="bg-gray-800 rounded p-2 flex justify-between items-center"
              >
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-300">{s.accent_profile_name || "No accent profile"}</span>
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
    </div>
  );
}
