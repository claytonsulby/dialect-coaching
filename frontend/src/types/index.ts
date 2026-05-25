export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  actors: ActorBrief[];
  audio_count: number;
}

export interface ActorBrief {
  id: number;
  name: string;
}

export interface Actor {
  id: number;
  name: string;
  notes: string;
  created_at: string;
  projects: ProjectBrief[];
}

export interface ProjectBrief {
  id: number;
  name: string;
}

export interface PhoneChange {
  id: number;
  expected_phone: string;
  actual_phone: string;
}

export interface Word {
  id: number;
  word_index: number;
  word: string;
  expected_phonemes: string;
  actual_phonemes: string;
  phone_changes: PhoneChange[];
}

export interface Segment {
  id: number;
  segment_index: number;
  text: string;
  expected_phonemes: string;
  actual_phonemes: string;
  start_time: number;
  end_time: number;
  words: Word[];
}

export interface AudioResource {
  id: number;
  project_id: number;
  actor_id: number | null;
  original_filename: string;
  duration: number | null;
  status: "pending" | "processing" | "ready" | "error";
  error_message: string | null;
  created_at: string;
}

export interface AudioDetail extends AudioResource {
  segments: Segment[];
}

export interface ImportEntry {
  speaker_name: string;
  audio_url: string;
  region_path: string;
  external_id: string;
  age_range: string | null;
  gender: string | null;
  ethnicity: string | null;
  socioeconomic_status: string | null;
  notes: string;
}

export interface ImportJob {
  id: number;
  source: string;
  status: "pending" | "processing" | "completed" | "error";
  total_entries: number;
  processed_entries: number;
  error_message: string | null;
  created_at: string;
}
