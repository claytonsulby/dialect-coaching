import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Actor, Speaker } from "../types";

export default function ActorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const actorId = Number(id);

  const [actor, setActor] = useState<Actor | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Linked speaker state
  const [linkedSpeaker, setLinkedSpeaker] = useState<Speaker | null>(null);
  const [samplesCount, setSamplesCount] = useState(0);

  // Speaker search typeahead state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Speaker[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const data = await api.actors.get(actorId);
    setActor(data);
    if (data.speaker_id) {
      try {
        const sp = await api.speakers.get(data.speaker_id);
        setLinkedSpeaker(sp);
        const samples = await api.samples.list({ speaker_id: String(data.speaker_id) });
        setSamplesCount(samples.length);
      } catch {
        setLinkedSpeaker(null);
        setSamplesCount(0);
      }
    } else {
      setLinkedSpeaker(null);
      setSamplesCount(0);
    }
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

  const handleUnlink = async () => {
    await api.actors.unlinkSpeaker(actorId);
    load();
  };

  const handleLink = async (speakerId: number) => {
    await api.actors.linkSpeaker(actorId, speakerId);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    load();
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await api.speakers.list({ q });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
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

      {/* Linked Speaker Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Linked Speaker</h2>
        {actor.speaker_id && linkedSpeaker ? (
          <div className="bg-gray-800 border border-gray-700 rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Link
                to={`/speakers/${linkedSpeaker.id}`}
                className="text-blue-400 hover:text-blue-300 font-medium transition"
              >
                {linkedSpeaker.name}
              </Link>
              <button
                onClick={handleUnlink}
                className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-sm transition"
              >
                Unlink
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-400">
              {linkedSpeaker.origin_region_name && (
                <div>Region: <span className="text-gray-200">{linkedSpeaker.origin_region_name}</span></div>
              )}
              {linkedSpeaker.age_range && (
                <div>Age: <span className="text-gray-200">{linkedSpeaker.age_range}</span></div>
              )}
              {linkedSpeaker.gender && (
                <div>Gender: <span className="text-gray-200">{linkedSpeaker.gender}</span></div>
              )}
              <div>Source: <span className="text-gray-200">{linkedSpeaker.source}</span></div>
              <div>Samples: <span className="text-gray-200">{samplesCount}</span></div>
            </div>
          </div>
        ) : (
          <div>
            {showSearch ? (
              <div className="relative">
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search speakers by name..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
                />
                {searching && (
                  <p className="text-xs text-gray-500 mt-1">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((sp) => (
                      <button
                        key={sp.id}
                        onClick={() => handleLink(sp.id)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm transition"
                      >
                        <span className="text-gray-200">{sp.name}</span>
                        {sp.gender && <span className="text-gray-500 ml-2">{sp.gender}</span>}
                        {sp.age_range && <span className="text-gray-500 ml-2">{sp.age_range}</span>}
                        {sp.source && <span className="text-gray-500 ml-2">({sp.source})</span>}
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery && !searching && searchResults.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">No speakers found.</p>
                )}
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}
                  className="mt-2 px-3 py-1 bg-gray-700 rounded text-sm transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
              >
                Link to Corpus Speaker
              </button>
            )}
          </div>
        )}
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
