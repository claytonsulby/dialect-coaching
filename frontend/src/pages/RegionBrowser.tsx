import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import type { Region, RegionBrief, RegionSearchResult } from "../types";

const TYPE_BADGES: Record<string, string> = {
  country: "bg-blue-600",
  state: "bg-green-600",
  county: "bg-yellow-600",
  city: "bg-purple-600",
  neighborhood: "bg-pink-600",
  custom: "bg-gray-600",
};

function TypeBadge({ type }: { type: string }) {
  const bg = TYPE_BADGES[type] ?? "bg-gray-600";
  return (
    <span className={`${bg} text-white text-xs px-2 py-0.5 rounded-full`}>
      {type}
    </span>
  );
}

function pathBreadcrumb(path: string): string {
  return path.split("/").join(" > ");
}

interface TreeNodeProps {
  brief: RegionBrief;
  onRefreshParent: () => void;
}

function TreeNode({ brief, onRefreshParent }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildType, setNewChildType] = useState("custom");
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");

  const loadRegion = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.regions.get(brief.id);
      setRegion(data);
    } finally {
      setLoading(false);
    }
  }, [brief.id]);

  const toggle = () => {
    if (!expanded && !region) {
      loadRegion();
    }
    setExpanded(!expanded);
  };

  const addChild = async () => {
    if (!newChildName.trim()) return;
    await api.regions.create({
      name: newChildName.trim(),
      region_type: newChildType,
      parent_id: brief.id,
    });
    setNewChildName("");
    setShowAddChild(false);
    await loadRegion();
    setExpanded(true);
  };

  const startEdit = () => {
    setEditName(brief.name);
    setEditType(brief.region_type);
    setShowEdit(true);
  };

  const saveEdit = async () => {
    await api.regions.update(brief.id, { name: editName, region_type: editType });
    setShowEdit(false);
    onRefreshParent();
  };

  const deleteRegion = async () => {
    await api.regions.delete(brief.id);
    onRefreshParent();
  };

  return (
    <div className="ml-4 border-l border-gray-800">
      <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-800/50 rounded-r transition group">
        <button
          onClick={toggle}
          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-300 text-xs flex-shrink-0"
        >
          {loading ? (
            <span className="animate-spin">...</span>
          ) : expanded ? (
            "▼"
          ) : (
            "▶"
          )}
        </button>
        <span className="font-medium text-white text-sm">{brief.name}</span>
        <TypeBadge type={brief.region_type} />
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddChild(!showAddChild);
            }}
            className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 rounded transition"
            title="Add sub-region"
          >
            + Sub
          </button>
          {!brief.is_seed && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit();
                }}
                className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRegion();
                }}
                className="px-2 py-0.5 text-xs bg-red-700 hover:bg-red-600 rounded transition"
              >
                Del
              </button>
            </>
          )}
        </div>
      </div>

      {showEdit && (
        <div className="ml-7 flex gap-2 py-1">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          <select
            value={editType}
            onChange={(e) => setEditType(e.target.value)}
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="country">country</option>
            <option value="state">state</option>
            <option value="county">county</option>
            <option value="city">city</option>
            <option value="neighborhood">neighborhood</option>
            <option value="custom">custom</option>
          </select>
          <button onClick={saveEdit} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition">
            Save
          </button>
          <button onClick={() => setShowEdit(false)} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition">
            Cancel
          </button>
        </div>
      )}

      {showAddChild && (
        <div className="ml-7 flex gap-2 py-1">
          <input
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addChild()}
            placeholder="Sub-region name..."
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          <select
            value={newChildType}
            onChange={(e) => setNewChildType(e.target.value)}
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="state">state</option>
            <option value="county">county</option>
            <option value="city">city</option>
            <option value="neighborhood">neighborhood</option>
            <option value="custom">custom</option>
          </select>
          <button onClick={addChild} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition">
            Add
          </button>
          <button onClick={() => setShowAddChild(false)} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition">
            Cancel
          </button>
        </div>
      )}

      {expanded && region && (
        <div>
          {region.children.length === 0 ? (
            <div className="ml-7 py-1 text-xs text-gray-500 italic">No sub-regions</div>
          ) : (
            region.children.map((child) => (
              <TreeNode key={child.id} brief={child} onRefreshParent={loadRegion} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function RegionBrowser() {
  const [roots, setRoots] = useState<Region[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RegionSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newRootName, setNewRootName] = useState("");

  const loadRoots = useCallback(async () => {
    const data = await api.regions.list();
    setRoots(data);
  }, []);

  useEffect(() => {
    loadRoots();
  }, [loadRoots]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.regions.search(searchQuery.trim());
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const addRootRegion = async () => {
    if (!newRootName.trim()) return;
    await api.regions.create({ name: newRootName.trim(), region_type: "country" });
    setNewRootName("");
    setShowAddRoot(false);
    loadRoots();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Regions</h1>
        <button
          onClick={() => setShowAddRoot(!showAddRoot)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
        >
          Add Country
        </button>
      </div>

      {showAddRoot && (
        <div className="flex gap-2">
          <input
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRootRegion()}
            placeholder="Country name..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          <button onClick={addRootRegion} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition">
            Create
          </button>
        </div>
      )}

      <div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search regions..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {searchResults !== null ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400">
              {searching ? "Searching..." : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`}
            </h2>
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              Clear search
            </button>
          </div>
          {searchResults.map((r) => (
            <div
              key={r.id}
              className="p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{r.name}</span>
                <TypeBadge type={r.region_type} />
              </div>
              <div className="text-xs text-gray-500 mt-1">{pathBreadcrumb(r.path)}</div>
            </div>
          ))}
          {searchResults.length === 0 && !searching && (
            <p className="text-gray-500 italic text-sm">No regions found.</p>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          {roots.length === 0 ? (
            <p className="text-gray-500 italic">No regions loaded.</p>
          ) : (
            roots.map((root) => (
              <TreeNode
                key={root.id}
                brief={{ id: root.id, name: root.name, region_type: root.region_type, path: root.path, is_seed: root.is_seed }}
                onRefreshParent={loadRoots}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
