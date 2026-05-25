import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AccentProfile } from "../types";
import SourceBadge from "../components/SourceBadge";

export default function AccentProfileList() {
  const [profiles, setProfiles] = useState<AccentProfile[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const data = await api.accentProfiles.list(params);
      setProfiles(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await api.accentProfiles.create({
      name: newName.trim(),
      description: newDesc.trim(),
    });
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    load();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Accent Profiles</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
        >
          New Profile
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <h2 className="text-sm font-semibold mb-3 text-gray-300">
            Create New Profile
          </h2>
          <div className="space-y-3">
            <input
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Profile name (e.g. Brooklyn English)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <textarea
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none resize-none"
              rows={2}
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Search profiles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : profiles.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No accent profiles found. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-3">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              to={`/accent-profiles/${profile.id}`}
              className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition block"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">
                      {profile.name}
                    </h3>
                    {profile.is_seed && (
                      <span className="px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 border border-emerald-700 rounded text-xs font-medium">
                        Seed
                      </span>
                    )}
                    <SourceBadge source={profile.source} />
                  </div>
                  {profile.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                      {profile.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 ml-4 text-xs text-gray-500 shrink-0">
                  <span>{profile.patterns.length} patterns</span>
                  <span>{profile.sample_count} samples</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
