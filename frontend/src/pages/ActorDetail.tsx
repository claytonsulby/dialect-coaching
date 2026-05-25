import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Actor } from "../types";

export default function ActorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const actorId = Number(id);

  const [actor, setActor] = useState<Actor | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const load = useCallback(async () => {
    setActor(await api.actors.get(actorId));
  }, [actorId]);

  useEffect(() => { load(); }, [load]);

  const saveEdit = async () => {
    await api.actors.update(actorId, { name: editName, notes: editNotes });
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this actor?")) return;
    await api.actors.delete(actorId);
    navigate("/");
  };

  if (!actor) return <p className="text-gray-500">Loading...</p>;

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
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Notes..."
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition">Save</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-700 rounded text-sm transition">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">{actor.name}</h1>
            {actor.notes && <p className="text-gray-400 mt-1">{actor.notes}</p>}
          </div>
        )}
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={() => { setEditName(actor.name); setEditNotes(actor.notes); setEditing(true); }}
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
        <h2 className="text-lg font-semibold mb-3">Projects</h2>
        {actor.projects.length === 0 ? (
          <p className="text-gray-500 italic text-sm">Not in any projects.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {actor.projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition"
              >
                {p.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
