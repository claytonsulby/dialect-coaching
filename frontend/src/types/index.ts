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

export interface SignaturePattern {
  id: number;
  expected_phone: string;
  actual_phone: string;
  frequency: number;
  occurrence_count: number;
  notes: string;
}

export interface AccentProfile {
  id: number;
  name: string;
  description: string;
  region_id: number | null;
  is_seed: boolean;
  source: string;
  sample_count: number;
  patterns: SignaturePattern[];
  created_at: string;
}

export interface AccentComparison {
  profile_a: AccentProfile;
  profile_b: AccentProfile;
  shared_patterns: Array<{
    expected_phone: string;
    actual_phone: string;
    frequency_a: number;
    frequency_b: number;
    notes_a: string;
    notes_b: string;
  }>;
  unique_to_a: Array<{
    expected_phone: string;
    actual_phone: string;
    frequency: number;
    notes: string;
  }>;
  unique_to_b: Array<{
    expected_phone: string;
    actual_phone: string;
    frequency: number;
    notes: string;
  }>;
}
