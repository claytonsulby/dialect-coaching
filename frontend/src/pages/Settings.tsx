import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AppSetting } from "../types";

export default function Settings() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [forvoKey, setForvoKey] = useState("");
  const [forvoConfigured, setForvoConfigured] = useState(false);
  const [editing, setEditing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, status] = await Promise.all([
      api.settings.list(),
      api.corpus.forvo.status(),
    ]);
    setSettings(s);
    setForvoConfigured(status.configured);
    const existing = s.find((x: AppSetting) => x.key === "forvo_api_key");
    if (existing) {
      setForvoKey(existing.value);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveForvoKey = async () => {
    setSaving(true);
    try {
      await api.settings.update("forvo_api_key", { value: forvoKey, is_secret: true });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.corpus.forvo.lookup({ word: "hello", language: "en" });
      setTestResult(`Success! Found ${result.count} pronunciation(s).`);
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Forvo API</h2>
        <p className="text-sm text-gray-400">
          Configure your Forvo API key to look up native speaker pronunciations.
        </p>

        <div className="space-y-3">
          <label className="block text-sm text-gray-300">API Key</label>
          {editing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={forvoKey}
                onChange={(e) => setForvoKey(e.target.value)}
                placeholder="Enter Forvo API key"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={saveForvoKey}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-400">
                {forvoConfigured ? "••••••••" : "Not configured"}
              </span>
              <button
                onClick={() => {
                  setForvoKey("");
                  setEditing(true);
                }}
                className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600"
              >
                {forvoConfigured ? "Change" : "Set Key"}
              </button>
            </div>
          )}
        </div>

        {forvoConfigured && (
          <div className="space-y-2">
            <button
              onClick={testConnection}
              disabled={testing}
              className="px-4 py-2 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600 disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {testResult && (
              <p className={`text-sm ${testResult.startsWith("Success") ? "text-green-400" : "text-red-400"}`}>
                {testResult}
              </p>
            )}
          </div>
        )}
      </div>

      {settings.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">All Settings</h2>
          <div className="space-y-2">
            {settings.map((s) => (
              <div key={s.key} className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-sm text-gray-300 font-mono">{s.key}</span>
                <span className="text-sm text-gray-400">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
