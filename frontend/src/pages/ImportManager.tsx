import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { ImportEntry, ImportJob } from "../types";

type Tab = "common_voice" | "speech_accent_archive" | "idea" | "phoible" | "forvo" | "custom";

const TABS: { key: Tab; label: string }[] = [
  { key: "common_voice", label: "Common Voice" },
  { key: "speech_accent_archive", label: "Speech Accent Archive" },
  { key: "idea", label: "IDEA" },
  { key: "phoible", label: "PHOIBLE" },
  { key: "forvo", label: "Forvo" },
  { key: "custom", label: "Custom" },
];

const LOCALES = ["en", "es", "fr", "de", "zh", "ja", "ko", "ar", "pt", "ru", "it", "nl", "pl", "tr", "sv"];

function StatusBadge({ status }: { status: ImportJob["status"] }) {
  const colors: Record<string, string> = {
    pending: "bg-gray-600 text-gray-200",
    processing: "bg-yellow-600 text-yellow-100",
    completed: "bg-green-700 text-green-100",
    error: "bg-red-700 text-red-100",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? "bg-gray-600 text-gray-200"}`}>
      {status}
    </span>
  );
}

function ProgressBar({ processed, total }: { processed: number; total: number }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  return (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQuotes) {
      if (ch === '"' && row[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { result.push(current.trim()); current = ""; }
    else current += ch;
  }
  result.push(current.trim());
  return result;
}

const INPUT_CLASS = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none";

// --- Tab content components ---

function CommonVoiceTab() {
  const [directory, setDirectory] = useState("");
  const [locale, setLocale] = useState("en");
  const [limit, setLimit] = useState(100);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadStatus();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function loadStatus() {
    try { setStatus(await api.corpus.commonVoice.status()); } catch { /* not available yet */ }
  }

  useEffect(() => {
    if (status?.status === "processing" && !intervalRef.current) {
      intervalRef.current = setInterval(loadStatus, 3000);
    } else if (status?.status !== "processing" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [status]);

  async function handleImport() {
    if (!directory.trim()) { setError("Directory path is required."); return; }
    setError("");
    setImporting(true);
    try {
      await api.corpus.commonVoice.import({ directory: directory.trim(), locale, limit });
      await loadStatus();
    } catch (err: any) { setError(err.message || "Import failed"); }
    finally { setImporting(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Import speaker audio clips from a local Mozilla Common Voice dataset directory.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-3">
          <label className="block text-xs text-gray-400 mb-1">Dataset Directory Path</label>
          <input value={directory} onChange={(e) => setDirectory(e.target.value)} placeholder="/path/to/cv-corpus-17.0/en" className={INPUT_CLASS} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Locale</label>
          <select value={locale} onChange={(e) => setLocale(e.target.value)} className={INPUT_CLASS}>
            {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sample Limit</label>
          <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value) || 100)} min={1} className={INPUT_CLASS} />
        </div>
        <div className="flex items-end">
          <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm font-medium transition text-white">
            {importing ? "Starting..." : "Start Import"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {status?.status === "processing" && (
        <div className="space-y-2">
          <p className="text-sm text-gray-300">Importing... {status.processed ?? 0}/{status.total ?? "?"}</p>
          <ProgressBar processed={status.processed ?? 0} total={status.total ?? 1} />
        </div>
      )}
    </div>
  );
}

function SpeechAccentArchiveTab() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    try { setStatus(await api.corpus.speechAccentArchive.status()); } catch { /* not available yet */ }
  }

  async function handleSync() {
    setError("");
    setSyncing(true);
    try {
      await api.corpus.speechAccentArchive.sync();
      await loadStatus();
    } catch (err: any) { setError(err.message || "Sync failed"); }
    finally { setSyncing(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Synchronize all speakers from the George Mason University Speech Accent Archive. This imports approximately 700 speakers with demographic data and audio recordings.
      </p>
      <button onClick={handleSync} disabled={syncing} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm font-medium transition text-white">
        {syncing ? "Syncing..." : "Sync All Speakers"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {status && (
        <div className="text-sm text-gray-400">
          {status.status === "processing" && <ProgressBar processed={status.processed ?? 0} total={status.total ?? 700} />}
          {status.speaker_count != null && <p>{status.speaker_count} speakers currently imported.</p>}
        </div>
      )}
    </div>
  );
}

function IdeaTab() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    try { setStatus(await api.corpus.idea.status()); } catch { /* not available yet */ }
  }

  async function handleSync() {
    setError("");
    setSyncing(true);
    try {
      await api.corpus.idea.sync();
      await loadStatus();
    } catch (err: any) { setError(err.message || "Sync failed"); }
    finally { setSyncing(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Synchronize all samples from the IDEA (International Dialects of English Archive). This imports speakers with dialect recordings from around the world.
      </p>
      <button onClick={handleSync} disabled={syncing} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm font-medium transition text-white">
        {syncing ? "Syncing..." : "Sync All Samples"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {status && (
        <div className="text-sm text-gray-400">
          {status.status === "processing" && <ProgressBar processed={status.processed ?? 0} total={status.total ?? 1} />}
          {status.sample_count != null && <p>{status.sample_count} samples currently imported.</p>}
        </div>
      )}
    </div>
  );
}

function PhoibleTab() {
  const [syncing, setSyncing] = useState(false);
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { loadInventories(); }, []);

  async function loadInventories() {
    try {
      const data = await api.phonemes.list();
      setInventoryCount(Array.isArray(data) ? data.length : 0);
    } catch { /* not available yet */ }
  }

  async function handleSync() {
    setError("");
    setSyncing(true);
    try {
      await api.phonemes.sync();
      await loadInventories();
    } catch (err: any) { setError(err.message || "Sync failed"); }
    finally { setSyncing(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        PHOIBLE is a repository of cross-linguistic phonological inventory data. Syncing imports phoneme inventories for languages and dialects, enabling phonological comparison across accent profiles.
      </p>
      {inventoryCount != null && (
        <p className="text-sm text-gray-300">{inventoryCount} phoneme inventories currently imported.</p>
      )}
      <button onClick={handleSync} disabled={syncing} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm font-medium transition text-white">
        {syncing ? "Syncing..." : "Sync Phoneme Data"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ForvoTab() {
  const [word, setWord] = useState("");
  const [language, setLanguage] = useState("en");
  const [looking, setLooking] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    api.corpus.forvo.status().then((s) => {
      if (s?.configured === false) setConfigured(false);
    }).catch(() => {});
  }, []);

  async function handleLookup() {
    if (!word.trim()) return;
    setError("");
    setLooking(true);
    setResults(null);
    try {
      const data = await api.corpus.forvo.lookup({ word: word.trim(), language });
      setResults(data?.pronunciations ?? data?.results ?? (Array.isArray(data) ? data : []));
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.includes("403") || err.message?.includes("key")) {
        setConfigured(false);
      }
      setError(err.message || "Lookup failed");
    } finally { setLooking(false); }
  }

  if (!configured) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Forvo provides crowd-sourced pronunciation audio. An API key is required.
        </p>
        <p className="text-sm text-yellow-400">
          Forvo API key is not configured. Please add your API key in <a href="/settings" className="underline hover:text-yellow-300">/settings</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Look up word pronunciations from Forvo&#39;s crowd-sourced audio database.
      </p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Word</label>
          <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="hello" className={INPUT_CLASS} onKeyDown={(e) => e.key === "Enter" && handleLookup()} />
        </div>
        <div className="w-28">
          <label className="block text-xs text-gray-400 mb-1">Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={INPUT_CLASS}>
            {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={handleLookup} disabled={looking || !word.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm font-medium transition text-white">
            {looking ? "Looking up..." : "Look Up"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {results && results.length === 0 && <p className="text-sm text-gray-500">No pronunciations found.</p>}
      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded">
              {r.audio_url && (
                <audio controls preload="none" className="h-8">
                  <source src={r.audio_url} />
                </audio>
              )}
              <div className="text-sm text-gray-300">
                {r.username && <span className="text-gray-400">{r.username}</span>}
                {r.country && <span className="text-gray-500 ml-2">({r.country})</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type CustomSource = "idea" | "speech_accent_archive" | "csv";
const CUSTOM_SOURCE_LABELS: Record<CustomSource, string> = {
  idea: "IDEA",
  speech_accent_archive: "Speech Accent Archive",
  csv: "CSV",
};

function CustomTab({ onImported }: { onImported: () => void }) {
  const [source, setSource] = useState<CustomSource>("idea");
  const [rawText, setRawText] = useState("");
  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleParse() {
    setParseError("");
    setEntries([]);
    const text = rawText.trim();
    if (!text) { setParseError("Paste JSON entries or upload a file."); return; }
    try {
      const parsed = JSON.parse(text);
      const arr: ImportEntry[] = Array.isArray(parsed) ? parsed : parsed.entries ?? [];
      if (!Array.isArray(arr) || arr.length === 0) { setParseError("Expected a JSON array of entry objects."); return; }
      setEntries(arr);
    } catch { setParseError("Invalid JSON. Please check the format."); }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setRawText(text);
      setParseError("");
      setEntries([]);
      try {
        const parsed = JSON.parse(text);
        const arr: ImportEntry[] = Array.isArray(parsed) ? parsed : parsed.entries ?? [];
        if (!Array.isArray(arr) || arr.length === 0) { setParseError("Expected a JSON array of entry objects."); return; }
        setEntries(arr);
      } catch {
        try {
          const lines = text.split("\n").filter((l) => l.trim());
          if (lines.length < 2) { setParseError("CSV must have a header row and at least one data row."); return; }
          const headers = parseCsvRow(lines[0]);
          const csvEntries: ImportEntry[] = lines.slice(1).map((line) => {
            const values = parseCsvRow(line);
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
            return {
              speaker_name: obj.speaker_name ?? "", audio_url: obj.audio_url ?? "",
              region_path: obj.region_path ?? "", external_id: obj.external_id ?? "",
              age_range: obj.age_range || null, gender: obj.gender || null,
              ethnicity: obj.ethnicity || null, socioeconomic_status: obj.socioeconomic_status || null,
              notes: obj.notes ?? "",
            };
          });
          setEntries(csvEntries);
          setRawText(JSON.stringify(csvEntries, null, 2));
        } catch { setParseError("Could not parse as JSON or CSV."); }
      }
    };
    reader.readAsText(file);
  }

  async function handleStartImport() {
    if (entries.length === 0) return;
    setSubmitting(true);
    try {
      const startFn = source === "idea" ? api.imports.startIdea : source === "speech_accent_archive" ? api.imports.startSpeechAccent : api.imports.startCsv;
      await startFn(entries);
      setEntries([]);
      setRawText("");
      onImported();
    } catch (err: any) { setParseError(err.message ?? "Import failed."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {(Object.keys(CUSTOM_SOURCE_LABELS) as CustomSource[]).map((s) => (
          <label key={s} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="radio" name="customSource" value={s} checked={source === s} onChange={() => setSource(s)} className="accent-blue-500" />
            {CUSTOM_SOURCE_LABELS[s]}
          </label>
        ))}
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Paste JSON entries or upload a JSON/CSV file</label>
        <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={8}
          placeholder={`[\n  {\n    "speaker_name": "John Doe",\n    "audio_url": "https://example.com/audio.mp3",\n    "region_path": "us/pa",\n    "external_id": "speaker-001"\n  }\n]`}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white font-mono focus:border-blue-500 focus:outline-none" />
      </div>
      <div className="flex items-center gap-3">
        <label className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition cursor-pointer text-gray-200">
          Upload File
          <input type="file" accept=".json,.csv" onChange={handleFileUpload} className="hidden" />
        </label>
        <button onClick={handleParse} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition text-gray-200">Parse JSON</button>
      </div>
      {parseError && <p className="text-sm text-red-400">{parseError}</p>}
      {entries.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">{entries.length} {entries.length === 1 ? "entry" : "entries"} parsed</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="py-2 pr-3">#</th><th className="py-2 pr-3">Speaker</th><th className="py-2 pr-3">Audio URL</th><th className="py-2 pr-3">Region</th><th className="py-2 pr-3">External ID</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 20).map((entry, i) => (
                  <tr key={i} className="border-b border-gray-800 text-gray-300">
                    <td className="py-1.5 pr-3 text-gray-500">{i + 1}</td>
                    <td className="py-1.5 pr-3">{entry.speaker_name || "-"}</td>
                    <td className="py-1.5 pr-3 max-w-xs truncate">{entry.audio_url || "-"}</td>
                    <td className="py-1.5 pr-3">{entry.region_path || "-"}</td>
                    <td className="py-1.5 pr-3">{entry.external_id || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length > 20 && <p className="text-xs text-gray-500 mt-1">Showing first 20 of {entries.length} entries</p>}
          </div>
          <button onClick={handleStartImport} disabled={submitting} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm font-medium transition text-white">
            {submitting ? "Starting..." : "Start Import"}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export default function ImportManager() {
  const [activeTab, setActiveTab] = useState<Tab>("common_voice");
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadJobs(); }, []);

  useEffect(() => {
    const hasProcessing = jobs.some((j) => j.status === "processing" || j.status === "pending");
    if (hasProcessing && !intervalRef.current) {
      intervalRef.current = setInterval(loadJobs, 3000);
    } else if (!hasProcessing && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [jobs]);

  async function loadJobs() {
    try { setJobs(await api.imports.listJobs()); } catch { /* ignore */ }
  }

  const tabSourceMap: Record<Tab, string[]> = {
    common_voice: ["common_voice"],
    speech_accent_archive: ["speech_accent_archive"],
    idea: ["idea"],
    phoible: ["phoible"],
    forvo: ["forvo"],
    custom: ["idea", "csv"],
  };
  const relevantJobs = jobs.filter((j) => tabSourceMap[activeTab]?.includes(j.source));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">Corpus Import Dashboard</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "border-b-2 border-blue-500 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
        {activeTab === "common_voice" && <CommonVoiceTab />}
        {activeTab === "speech_accent_archive" && <SpeechAccentArchiveTab />}
        {activeTab === "idea" && <IdeaTab />}
        {activeTab === "phoible" && <PhoibleTab />}
        {activeTab === "forvo" && <ForvoTab />}
        {activeTab === "custom" && <CustomTab onImported={loadJobs} />}
      </div>

      {/* Import History for this tab */}
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Import History</h2>
          <button onClick={loadJobs} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition text-gray-200">Refresh</button>
        </div>
        {relevantJobs.length === 0 ? (
          <p className="text-sm text-gray-500">No import jobs for this source yet.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="py-2 pr-3">ID</th><th className="py-2 pr-3">Source</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Progress</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {relevantJobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-800 text-gray-300">
                  <td className="py-2 pr-3 text-gray-500">{job.id}</td>
                  <td className="py-2 pr-3">{job.source}</td>
                  <td className="py-2 pr-3"><StatusBadge status={job.status} /></td>
                  <td className="py-2 pr-3">{job.processed_entries}/{job.total_entries}</td>
                  <td className="py-2 pr-3 text-gray-500">{new Date(job.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-3">
                    {job.error_message ? (
                      <button onClick={() => setExpandedError(expandedError === job.id ? null : job.id)} className="text-red-400 hover:text-red-300 text-xs underline">
                        {expandedError === job.id ? "hide" : "show"}
                      </button>
                    ) : <span className="text-gray-600">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {expandedError !== null && (
          <div className="p-3 bg-gray-800 border border-red-900 rounded text-xs text-red-300 font-mono whitespace-pre-wrap">
            {jobs.find((j) => j.id === expandedError)?.error_message}
          </div>
        )}
      </div>
    </div>
  );
}
