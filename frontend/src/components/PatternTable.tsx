import { useState } from "react";
import type { SignaturePattern } from "../types";

interface PatternTableProps {
  patterns: SignaturePattern[];
  onAdd: (data: {
    expected_phone: string;
    actual_phone: string;
    frequency: number;
    notes: string;
  }) => Promise<void>;
  onUpdate: (
    patternId: number,
    data: {
      expected_phone?: string;
      actual_phone?: string;
      frequency?: number;
      notes?: string;
    }
  ) => Promise<void>;
  onDelete: (patternId: number) => Promise<void>;
}

interface EditState {
  expected_phone: string;
  actual_phone: string;
  frequency: string;
  notes: string;
}

export default function PatternTable({
  patterns,
  onAdd,
  onUpdate,
  onDelete,
}: PatternTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({
    expected_phone: "",
    actual_phone: "",
    frequency: "",
    notes: "",
  });
  const [newRow, setNewRow] = useState<EditState>({
    expected_phone: "",
    actual_phone: "",
    frequency: "0",
    notes: "",
  });
  const [showAddRow, setShowAddRow] = useState(false);

  const startEdit = (p: SignaturePattern) => {
    setEditingId(p.id);
    setEditState({
      expected_phone: p.expected_phone,
      actual_phone: p.actual_phone,
      frequency: String(p.frequency),
      notes: p.notes,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (patternId: number) => {
    await onUpdate(patternId, {
      expected_phone: editState.expected_phone,
      actual_phone: editState.actual_phone,
      frequency: parseFloat(editState.frequency) || 0,
      notes: editState.notes,
    });
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newRow.expected_phone || !newRow.actual_phone) return;
    await onAdd({
      expected_phone: newRow.expected_phone,
      actual_phone: newRow.actual_phone,
      frequency: parseFloat(newRow.frequency) || 0,
      notes: newRow.notes,
    });
    setNewRow({ expected_phone: "", actual_phone: "", frequency: "0", notes: "" });
    setShowAddRow(false);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="py-2 pr-3 font-medium">Expected</th>
            <th className="py-2 pr-3 font-medium">Actual</th>
            <th className="py-2 pr-3 font-medium w-40">Frequency</th>
            <th className="py-2 pr-3 font-medium">Notes</th>
            <th className="py-2 font-medium w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {patterns.map((p) => (
            <tr key={p.id} className="border-b border-gray-800">
              {editingId === p.id ? (
                <>
                  <td className="py-2 pr-3">
                    <input
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-20"
                      value={editState.expected_phone}
                      onChange={(e) =>
                        setEditState({ ...editState, expected_phone: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-20"
                      value={editState.actual_phone}
                      onChange={(e) =>
                        setEditState({ ...editState, actual_phone: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-20"
                      value={editState.frequency}
                      onChange={(e) =>
                        setEditState({ ...editState, frequency: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-full"
                      value={editState.notes}
                      onChange={(e) =>
                        setEditState({ ...editState, notes: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveEdit(p.id)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-2 pr-3 font-mono text-blue-300">
                    /{p.expected_phone}/
                  </td>
                  <td className="py-2 pr-3 font-mono text-amber-300">
                    [{p.actual_phone}]
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.round(p.frequency * 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-xs w-10 text-right">
                        {Math.round(p.frequency * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-gray-400">{p.notes}</td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(p)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {showAddRow && (
            <tr className="border-b border-gray-800">
              <td className="py-2 pr-3">
                <input
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-20"
                  placeholder="e.g. ae"
                  value={newRow.expected_phone}
                  onChange={(e) =>
                    setNewRow({ ...newRow, expected_phone: e.target.value })
                  }
                />
              </td>
              <td className="py-2 pr-3">
                <input
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-20"
                  placeholder="e.g. ea"
                  value={newRow.actual_phone}
                  onChange={(e) =>
                    setNewRow({ ...newRow, actual_phone: e.target.value })
                  }
                />
              </td>
              <td className="py-2 pr-3">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-20"
                  value={newRow.frequency}
                  onChange={(e) =>
                    setNewRow({ ...newRow, frequency: e.target.value })
                  }
                />
              </td>
              <td className="py-2 pr-3">
                <input
                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none w-full"
                  placeholder="Description of the pattern"
                  value={newRow.notes}
                  onChange={(e) =>
                    setNewRow({ ...newRow, notes: e.target.value })
                  }
                />
              </td>
              <td className="py-2">
                <div className="flex gap-1">
                  <button
                    onClick={handleAdd}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddRow(false)}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!showAddRow && (
        <button
          onClick={() => setShowAddRow(true)}
          className="mt-3 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm font-medium transition"
        >
          + Add Pattern
        </button>
      )}
    </div>
  );
}
