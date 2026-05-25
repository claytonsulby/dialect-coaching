import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import AudioUpload from "../components/AudioUpload";
import type { Project, AudioResource, Actor } from "../types";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioResource[]>([]);
  const [allActors, setAllActors] = useState<Actor[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showActorPicker, setShowActorPicker] = useState(false);

  const load = useCallback(async () => {
    const [p, audio, actors] = await Promise.all([
      api.projects.get(projectId),
      api.audio.list(projectId),
      api.actors.list(),
    ]);
    setProject(p);
    setAudioFiles(audio);
    setAllActors(actors);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const saveEdit = async () => {
    await api.projects.update(projectId, { name: editName, description: editDesc });
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this project and all its audio?")) return;
    await api.projects.delete(projectId);
    navigate("/");
  };

  const assignActor = async (actorId: number) => {
    await api.projects.assignActor(projectId, actorId);
    setShowActorPicker(false);
    load();
  };

  const removeActor = async (actorId: number) => {
    await api.projects.removeActor(projectId, actorId);
    load();
  };

  const transcribeAudio = async (audioId: number) => {
    await api.audio.transcribe(audioId);
    load();
  };

  const deleteAudio = async (audioId: number) => {
    if (!confirm("Delete this audio file?")) return;
    await api.audio.delete(audioId);
    load();
  };

  if (!project) return <p className="text-gray-500">Loading...</p>;

  const assignedIds = new Set(project.actors.map((a) => a.id));
  const unassigned = allActors.filter((a) => !assignedIds.has(a.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        {editing ? (
          <div className="space-y-2 flex-1 mr-4">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-lg font-bold focus:border-blue-500 focus:outline-none"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition">Save</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-700 rounded text-sm transition">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && <p className="text-gray-400 mt-1">{project.description}</p>}
          </div>
        )}
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={() => { setEditName(project.name); setEditDesc(project.description); setEditing(true); }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
            >
              Edit
            </button>
          )}
          <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-sm transition">
            Delete
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Actors</h2>
          <button
            onClick={() => setShowActorPicker(!showActorPicker)}
            className="text-sm text-blue-400 hover:text-blue-300 transition"
          >
            + Add Actor
          </button>
        </div>

        {showActorPicker && unassigned.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
            {unassigned.map((a) => (
              <button
                key={a.id}
                onClick={() => assignActor(a.id)}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm transition"
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {project.actors.map((a) => (
            <div key={a.id} className="flex items-center gap-1 px-3 py-1 bg-gray-800 rounded-full text-sm">
              <Link to={`/actors/${a.id}`} className="hover:text-blue-400 transition">{a.name}</Link>
              <button
                onClick={() => removeActor(a.id)}
                className="text-gray-500 hover:text-red-400 ml-1 transition"
              >
                x
              </button>
            </div>
          ))}
          {project.actors.length === 0 && <p className="text-gray-500 text-sm italic">No actors assigned.</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Audio Files</h2>
          <AudioUpload projectId={projectId} onUploaded={load} />
        </div>

        {audioFiles.length === 0 ? (
          <p className="text-gray-500 italic">No audio files yet.</p>
        ) : (
          <div className="grid gap-3">
            {audioFiles.map((a) => (
              <div
                key={a.id}
                className="p-4 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between"
              >
                <div className="flex-1">
                  <Link
                    to={a.status === "ready" ? `/audio/${a.id}` : "#"}
                    className={`font-medium ${a.status === "ready" ? "text-white hover:text-blue-400 transition" : "text-gray-400"}`}
                  >
                    {a.original_filename}
                  </Link>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    {a.duration && <span>{a.duration.toFixed(1)}s</span>}
                    <span
                      className={
                        a.status === "ready"
                          ? "text-emerald-400"
                          : a.status === "error"
                            ? "text-red-400"
                            : a.status === "processing"
                              ? "text-amber-400"
                              : "text-gray-500"
                      }
                    >
                      {a.status}
                    </span>
                    {a.error_message && <span className="text-red-400">{a.error_message}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {(a.status === "pending" || a.status === "error") && (
                    <button
                      onClick={() => transcribeAudio(a.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition"
                    >
                      Transcribe
                    </button>
                  )}
                  {a.status === "processing" && (
                    <button
                      onClick={load}
                      className="px-3 py-1 bg-gray-700 rounded text-xs animate-pulse"
                    >
                      Processing...
                    </button>
                  )}
                  <button
                    onClick={() => deleteAudio(a.id)}
                    className="px-2 py-1 text-red-400/50 hover:text-red-400 text-xs transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
