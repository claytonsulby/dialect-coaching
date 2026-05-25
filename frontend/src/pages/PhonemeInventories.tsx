import { useEffect, useState } from "react";
import { api } from "../api/client";
import { PhonemeInventory } from "../types";

export default function PhonemeInventories() {
  const [inventories, setInventories] = useState<PhonemeInventory[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q) params.q = q;
      const data = await api.phonemes.list(params);
      setInventories(data as PhonemeInventory[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = () => {
    load(search);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.phonemes.sync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Phoneme Inventories</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {syncing ? "Syncing..." : "Sync from PHOIBLE"}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by language name..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-200 placeholder-gray-500"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition"
        >
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : inventories.length === 0 ? (
        <p className="text-gray-400">
          No inventories found. Click "Sync from PHOIBLE" to import phoneme data.
        </p>
      ) : (
        <div className="space-y-2">
          {inventories.map((inv) => (
            <div
              key={inv.id}
              className="bg-gray-800 border border-gray-700 rounded"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === inv.id ? null : inv.id)
                }
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-750 transition"
              >
                <div>
                  <span className="text-white font-medium">
                    {inv.language_name}
                  </span>
                  {inv.iso639_3 && (
                    <span className="ml-2 text-xs text-gray-400">
                      [{inv.iso639_3}]
                    </span>
                  )}
                  {inv.source_dataset && (
                    <span className="ml-2 text-xs text-blue-400">
                      {inv.source_dataset}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>C: {inv.consonants.length}</span>
                  <span>V: {inv.vowels.length}</span>
                  <span>T: {inv.tones.length}</span>
                  <span className="text-gray-500">
                    {expandedId === inv.id ? "▲" : "▼"}
                  </span>
                </div>
              </button>
              {expandedId === inv.id && (
                <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
                  {inv.glottocode && (
                    <p className="text-sm text-gray-400">
                      Glottocode: {inv.glottocode}
                    </p>
                  )}
                  {inv.consonants.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-1">
                        Consonants ({inv.consonants.length})
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {inv.consonants.map((p, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-700 rounded text-sm text-gray-200 font-mono"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {inv.vowels.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-1">
                        Vowels ({inv.vowels.length})
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {inv.vowels.map((p, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-700 rounded text-sm text-gray-200 font-mono"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {inv.tones.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-1">
                        Tones ({inv.tones.length})
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {inv.tones.map((p, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-gray-700 rounded text-sm text-gray-200 font-mono"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
