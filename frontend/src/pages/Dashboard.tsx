import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Project, Actor } from "../types";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newActorName, setNewActorName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewActor, setShowNewActor] = useState(false);

  const load = useCallback(async () => {
    const [p, a] = await Promise.all([api.projects.list(), api.actors.list()]);
    setProjects(p);
    setActors(a);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    await api.projects.create({ name: newProjectName.trim() });
    setNewProjectName("");
    setShowNewProject(false);
    load();
  };

  const createActor = async () => {
    if (!newActorName.trim()) return;
    await api.actors.create({ name: newActorName.trim() });
    setNewActorName("");
    setShowNewActor(false);
    load();
  };

  const standaloneActors = actors.filter((a) => a.projects.length === 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Projects</h2>
          <button
            onClick={() => setShowNewProject(!showNewProject)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
          >
            New Project
          </button>
        </div>

        {showNewProject && (
          <div className="flex gap-2 mb-4">
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="Project name..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <button onClick={createProject} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition">
              Create
            </button>
          </div>
        )}

        {projects.length === 0 ? (
          <p className="text-gray-500 italic">No projects yet.</p>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="block p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
              >
                <div className="font-medium text-white">{p.name}</div>
                {p.description && <div className="text-sm text-gray-400 mt-1">{p.description}</div>}
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>{p.actors.length} actor{p.actors.length !== 1 ? "s" : ""}</span>
                  <span>{p.audio_count} audio file{p.audio_count !== 1 ? "s" : ""}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Standalone Actors</h2>
          <button
            onClick={() => setShowNewActor(!showNewActor)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition"
          >
            New Actor
          </button>
        </div>

        {showNewActor && (
          <div className="flex gap-2 mb-4">
            <input
              value={newActorName}
              onChange={(e) => setNewActorName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createActor()}
              placeholder="Actor name..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <button onClick={createActor} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition">
              Create
            </button>
          </div>
        )}

        {standaloneActors.length === 0 ? (
          <p className="text-gray-500 italic text-sm">
            {actors.length > 0 ? "All actors are in projects." : "No actors yet."}
          </p>
        ) : (
          <div className="grid gap-2">
            {standaloneActors.map((a) => (
              <Link
                key={a.id}
                to={`/actors/${a.id}`}
                className="block p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
              >
                <span className="font-medium text-white">{a.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
