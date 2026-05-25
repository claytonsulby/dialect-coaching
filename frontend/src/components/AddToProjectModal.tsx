import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Props {
  sampleId: number;
  onClose: () => void;
  onAssigned: () => void;
}

export default function AddToProjectModal({ sampleId, onClose, onAssigned }: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    api.projects.list().then((data) => {
      setProjects(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelect = async (projectId: number) => {
    setAssigning(true);
    try {
      await api.samples.setProject(sampleId, projectId);
      onAssigned();
    } catch (err) {
      console.error("Failed to assign project:", err);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">Add to Project</h2>

        {loading ? (
          <p className="text-sm text-gray-400">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-400">No projects found. Create a project first.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                disabled={assigning}
                onClick={() => handleSelect(project.id)}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-200 text-sm transition disabled:opacity-50"
              >
                {project.name}
                {project.description && (
                  <span className="block text-xs text-gray-500 truncate">{project.description}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
