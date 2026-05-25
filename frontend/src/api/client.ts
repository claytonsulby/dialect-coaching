const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  const { headers: _, ...rest } = options ?? {};
  const res = await fetch(`${BASE}${path}`, { headers, ...rest });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export { downloadBlob };

export const api = {
  projects: {
    list: () => request<any[]>("/projects"),
    create: (data: { name: string; description?: string }) =>
      request<any>("/projects", { method: "POST", body: JSON.stringify(data) }),
    get: (id: number) => request<any>(`/projects/${id}`),
    update: (id: number, data: any) =>
      request<any>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/projects/${id}`, { method: "DELETE" }),
    assignActor: (projectId: number, actorId: number) =>
      request<void>(`/projects/${projectId}/actors/${actorId}`, { method: "POST" }),
    removeActor: (projectId: number, actorId: number) =>
      request<void>(`/projects/${projectId}/actors/${actorId}`, { method: "DELETE" }),
  },
  actors: {
    list: () => request<any[]>("/actors"),
    create: (data: { name: string; notes?: string }) =>
      request<any>("/actors", { method: "POST", body: JSON.stringify(data) }),
    get: (id: number) => request<any>(`/actors/${id}`),
    update: (id: number, data: any) =>
      request<any>(`/actors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/actors/${id}`, { method: "DELETE" }),
  },
  audio: {
    list: (projectId: number) => request<any[]>(`/projects/${projectId}/audio`),
    upload: async (projectId: number, file: File, actorId?: number) => {
      const form = new FormData();
      form.append("file", file);
      const params = actorId ? `?actor_id=${actorId}` : "";
      const res = await fetch(`${BASE}/projects/${projectId}/audio${params}`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    get: (id: number) => request<any>(`/audio/${id}`),
    transcribe: (id: number, model = "base") =>
      request<any>(`/audio/${id}/transcribe?model=${model}`, { method: "POST" }),
    segments: (id: number) => request<any[]>(`/audio/${id}/segments`),
    fileUrl: (id: number) => `${BASE}/audio/${id}/file`,
    exportAudio: async (id: number, segmentIds: number[], timeRanges: [number, number][]) => {
      const res = await fetch(`${BASE}/audio/${id}/export/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment_ids: segmentIds, time_ranges: timeRanges }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.blob();
    },
    exportReport: async (id: number, segmentIds: number[], timeRanges: [number, number][]) => {
      const res = await fetch(`${BASE}/audio/${id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment_ids: segmentIds, time_ranges: timeRanges }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    delete: (id: number) => request<void>(`/audio/${id}`, { method: "DELETE" }),
  },
  regions: {
    list: (params?: Record<string, string>) =>
      request<any[]>(`/regions${params ? '?' + new URLSearchParams(params).toString() : ''}`),
    get: (id: number) => request<any>(`/regions/${id}`),
    search: (q: string) => request<any[]>(`/regions/search?q=${encodeURIComponent(q)}`),
    create: (data: { name: string; region_type?: string; parent_id?: number | null }) =>
      request<any>("/regions", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { name?: string; region_type?: string }) =>
      request<any>(`/regions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/regions/${id}`, { method: "DELETE" }),
    descendants: (id: number) => request<any[]>(`/regions/${id}/descendants`),
  },
  speakers: {
    list: (params?: Record<string, string>) =>
      request<any[]>(`/speakers${params ? '?' + new URLSearchParams(params).toString() : ''}`),
    get: (id: number) => request<any>(`/speakers/${id}`),
    create: (data: any) =>
      request<any>("/speakers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/speakers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/speakers/${id}`, { method: "DELETE" }),
  },
  accentProfiles: {
    list: (params?: Record<string, string>) =>
      request<any[]>(
        `/accent-profiles${params ? "?" + new URLSearchParams(params).toString() : ""}`
      ),
    get: (id: number) => request<any>(`/accent-profiles/${id}`),
    create: (data: any) =>
      request<any>("/accent-profiles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      request<any>(`/accent-profiles/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/accent-profiles/${id}`, { method: "DELETE" }),
    addPattern: (id: number, data: any) =>
      request<any>(`/accent-profiles/${id}/patterns`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updatePattern: (id: number, patternId: number, data: any) =>
      request<any>(`/accent-profiles/${id}/patterns/${patternId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deletePattern: (id: number, patternId: number) =>
      request<void>(`/accent-profiles/${id}/patterns/${patternId}`, {
        method: "DELETE",
      }),
    aggregate: (id: number) =>
      request<any>(`/accent-profiles/${id}/aggregate`, { method: "POST" }),
    compare: (id: number, compareToId: number) =>
      request<any>(
        `/accent-profiles/${id}/compare?compare_to=${compareToId}`
      ),
  },
  samples: {
    list: (params?: Record<string, string>) =>
      request<any[]>(`/samples${params ? '?' + new URLSearchParams(params).toString() : ''}`),
    get: (id: number) => request<any>(`/samples/${id}`),
    create: (data: any) =>
      request<any>("/samples", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/samples/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/samples/${id}`, { method: "DELETE" }),
  },
  tags: {
    list: () => request<any[]>("/tags"),
    create: (data: { name: string }) =>
      request<any>("/tags", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/tags/${id}`, { method: "DELETE" }),
  },
  imports: {
    startIdea: (entries: any[]) =>
      request<any>("/imports/idea", { method: "POST", body: JSON.stringify({ entries }) }),
    startSpeechAccent: (entries: any[]) =>
      request<any>("/imports/speech-accent-archive", { method: "POST", body: JSON.stringify({ entries }) }),
    startCsv: (entries: any[]) =>
      request<any>("/imports/csv", { method: "POST", body: JSON.stringify({ entries }) }),
    listJobs: () => request<any[]>("/imports/jobs"),
    getJob: (id: number) => request<any>(`/imports/jobs/${id}`),
  },
  corpus: {
    commonVoice: {
      import: (data: { directory: string; locale: string; limit: number }) =>
        request<any>("/corpus/common-voice/import", { method: "POST", body: JSON.stringify(data) }),
      status: () => request<any>("/corpus/common-voice/status"),
    },
    speechAccentArchive: {
      sync: () => request<any>("/corpus/speech-accent-archive/sync", { method: "POST" }),
      status: () => request<any>("/corpus/speech-accent-archive/status"),
    },
    forvo: {
      lookup: (data: { word: string; language: string }) =>
        request<any>("/corpus/forvo/lookup", { method: "POST", body: JSON.stringify(data) }),
      status: () => request<any>("/corpus/forvo/status"),
    },
  },
  phonemes: {
    sync: () => request<any>("/phonemes/sync", { method: "POST" }),
    inventories: () => request<any>("/phonemes/inventories"),
  },
  discovery: {
    search: (params: Record<string, string>) =>
      request<any>(`/discovery/search?${new URLSearchParams(params).toString()}`),
    stats: () => request<any>("/discovery/stats"),
  },
};
