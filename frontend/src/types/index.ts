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

// ---------------------------------------------------------------------------
// Discovery types
// ---------------------------------------------------------------------------

export interface Speaker {
  id: number;
  name: string;
  origin_region_id: number | null;
  origin_region_name: string | null;
  age_range: string | null;
  gender: string | null;
  ethnicity: string | null;
  socioeconomic_status: string | null;
  source: string;
  created_at: string;
}

export interface SpeakerSample {
  id: number;
  speaker_id: number;
  speaker_name: string;
  accent_profile_id: number | null;
  accent_profile_name: string | null;
  audio_resource_id: number;
  quality_rating: number | null;
  accent_strength: number | null;
  is_curated: boolean;
  tags: string[];
  created_at: string;
}

export interface AccentProfileSummary {
  id: number;
  name: string;
  description: string;
  region_id: number | null;
  region_name: string | null;
  is_seed: boolean;
  source: string;
  sample_count: number;
  pattern_count: number;
  created_at: string;
}

export interface DiscoveryResult {
  speakers: Speaker[];
  samples: SpeakerSample[];
  profiles: AccentProfileSummary[];
  total_count: number;
}

export interface DiscoveryStats {
  total_speakers: number;
  total_samples: number;
  total_profiles: number;
  total_regions: number;
}
