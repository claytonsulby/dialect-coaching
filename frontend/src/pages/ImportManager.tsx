import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { ImportEntry, ImportJob } from "../types";

// --- Shared UI ---

const INPUT_CLASS = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus:border-blue-500 focus:outline-none";
const CARD_CLASS = "p-5 bg-gray-900 border border-gray-800 rounded-lg space-y-4";
const BTN_PRIMARY = "px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm font-medium transition text-white";

const LOCALES = ["en", "es", "fr", "de", "zh", "ja", "ko", "ar", "pt", "ru", "it", "nl", "pl", "tr", "sv"];

function StatusBadge({ status }: { status: ImportJob["status"] | string }) {
  const colors: Record<string, string> = {
    pending: "bg-gray-600 text-gray-200",
    processing: "bg-yellow-600 text-yellow-100",
    completed: "bg-green-700 text-green-100",
    synced: "bg-green-700 text-green-100",
    error: "bg-red-700 text-red-100",
    "not synced": "bg-gray-600 text-gray-200",
    syncing: "bg-yellow-600 text-yellow-100",
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

// --- Source Cards ---

function IDEACard() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadStatus();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function loadStatus() {
    try { setStatus(await api.corpus.idea.status()); } catch { /* not available yet */ }
  }

  useEffect(() => {
    if (status?.status === "processing" && !intervalRef.current) {
      intervalRef.current = setInterval(loadStatus, 3000);
    } else if (status?.status !== "processing" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [status]);

  async function handleSync() {
    setError("");
    setSyncing(true);
    try {
      await api.corpus.idea.sync();
      await loadStatus();
    } catch (err: any) { setError(err.message || "Sync failed"); }
    finally { setSyncing(false); }
  }

  const badge = status?.status === "processing" ? "syncing" : status?.sample_count ? "synced" : "not synced";

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🌍</span> IDEA
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            International Dialects of English Archive. ~1,800 dialect samples from 135 countries.
          </p>
        </div>
        <StatusBadge status={badge} />
      </div>
      {status?.sample_count != null && (
        <p className="text-sm text-gray-300">{status.sample_count} samples imported.</p>
      )}
      {status?.status === "processing" && (
        <ProgressBar processed={status.processed ?? 0} total={status.total ?? 1800} />
      )}
      <button onClick={handleSync} disabled={syncing} className={BTN_PRIMARY}>
        {syncing ? "Syncing..." : "Sync Samples"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function SpeechAccentArchiveCard() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadStatus();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function loadStatus() {
    try { setStatus(await api.corpus.speechAccentArchive.status()); } catch { /* not available yet */ }
  }

  useEffect(() => {
    if (status?.status === "processing" && !intervalRef.current) {
      intervalRef.current = setInterval(loadStatus, 3000);
    } else if (status?.status !== "processing" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [status]);

  async function handleSync() {
    setError("");
    setSyncing(true);
    try {
      await api.corpus.speechAccentArchive.sync();
      await loadStatus();
    } catch (err: any) { setError(err.message || "Sync failed"); }
    finally { setSyncing(false); }
  }

  const badge = status?.status === "processing" ? "syncing" : status?.speaker_count ? "synced" : "not synced";

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🎙️</span> Speech Accent Archive
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            George Mason University archive. ~700 speakers across languages.
          </p>
        </div>
        <StatusBadge status={badge} />
      </div>
      {status?.speaker_count != null && (
        <p className="text-sm text-gray-300">{status.speaker_count} speakers imported.</p>
      )}
      {status?.status === "processing" && (
        <ProgressBar processed={status.processed ?? 0} total={status.total ?? 700} />
      )}
      <button onClick={handleSync} disabled={syncing} className={BTN_PRIMARY}>
        {syncing ? "Syncing..." : "Sync Samples"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function CommonVoiceCard() {
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

  const badge = status?.status === "processing" ? "syncing" : status?.sample_count ? "synced" : "not synced";

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🦊</span> Common Voice
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Mozilla's crowdsourced voice dataset.
          </p>
        </div>
        <StatusBadge status={badge} />
      </div>
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
          <button onClick={handleImport} disabled={importing} className={BTN_PRIMARY}>
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

function PhoibleCard() {
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

  const badge = inventoryCount != null && inventoryCount > 0 ? "synced" : "not synced";

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🔤</span> PHOIBLE
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Cross-linguistic phoneme inventories.
          </p>
        </div>
        <StatusBadge status={syncing ? "syncing" : badge} />
      </div>
      {inventoryCount != null && (
        <p className="text-sm text-gray-300">{inventoryCount} phoneme inventories imported.</p>
      )}
      <button onClick={handleSync} disabled={syncing} className={BTN_PRIMARY}>
        {syncing ? "Syncing..." : "Sync Inventories"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ForvoCard() {
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

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🗣️</span> Forvo
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Word pronunciation database.
          </p>
        </div>
        <StatusBadge status={configured ? "synced" : "not synced"} />
      </div>
      {!configured ? (
        <p className="text-sm text-yellow-400">
          Forvo API key is not configured. Please add your API key in <a href="/settings" className="underline hover:text-yellow-300">Settings</a>.
        </p>
      ) : (
        <>
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
              <button onClick={handleLookup} disabled={looking || !word.trim()} className={BTN_PRIMARY}>
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
        </>
      )}
    </div>
  );
}

function CustomImportCard({ onImported }: { onImported: () => void }) {
  const [source, setSource] = useState<"idea" | "speech_accent_archive" | "csv">("csv");
  const [rawText, setRawText] = useState("");
  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const SOURCE_LABELS: Record<string, string> = {
    idea: "IDEA",
    speech_accent_archive: "Speech Accent Archive",
    csv: "CSV",
  };

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
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📄</span> Custom Import
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Import from CSV or JSON.
          </p>
        </div>
      </div>
      <div className="flex gap-4">
        {(Object.keys(SOURCE_LABELS) as Array<"idea" | "speech_accent_archive" | "csv">).map((s) => (
          <label key={s} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="radio" name="customSource" value={s} checked={source === s} onChange={() => setSource(s)} className="accent-blue-500" />
            {SOURCE_LABELS[s]}
          </label>
        ))}
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Paste JSON entries or upload a JSON/CSV file</label>
        <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={6}
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
          <button onClick={handleStartImport} disabled={submitting} className={BTN_PRIMARY}>
            {submitting ? "Starting..." : "Start Import"}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export default function ImportManager() {
  const navigate = useNavigate();
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Import</h1>
        <p className="text-gray-400">
          Import dialect samples from research archives and corpus databases. Browse imported samples in Discovery.
        </p>
        <button
          onClick={() => navigate("/discovery")}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition"
        >
          Browse in Discovery &rarr;
        </button>
      </div>

      {/* Import Sources */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Import Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IDEACard />
          <SpeechAccentArchiveCard />
          <CommonVoiceCard />
          <PhoibleCard />
          <ForvoCard />
          <CustomImportCard onImported={loadJobs} />
        </div>
      </div>

      {/* Import History */}
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Import History</h2>
          <button onClick={loadJobs} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition text-gray-200">Refresh</button>
        </div>
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">No import jobs yet.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="py-2 pr-3">ID</th><th className="py-2 pr-3">Source</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Progress</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
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
