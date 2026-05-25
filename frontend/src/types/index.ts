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

// --- Region types (Unit 1) ---

export interface Region {
  id: number;
  name: string;
  region_type: string;
  path: string;
  iso_code: string | null;
  parent_id: number | null;
  source: string;
  children: RegionBrief[];
  created_at: string;
}

export interface RegionBrief {
  id: number;
  name: string;
  region_type: string;
  path: string;
  source: string;
}

export interface RegionSearchResult {
  id: number;
  name: string;
  region_type: string;
  path: string;
  iso_code: string | null;
  parent_id: number | null;
}

// --- Speaker types (Unit 2) ---

export interface Speaker {
  id: number;
  name: string;
  origin_region_id: number | null;
  origin_region_name?: string | null;
  age_range: string | null;
  gender: string | null;
  ethnicity: string | null;
  socioeconomic_status: string | null;
  notes: string;
  source: string;
  external_id: string | null;
  created_at: string;
}

// --- Accent Profile types (Unit 3) ---

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

// --- Sample & Tag types (Unit 4) ---

export interface SpeakerSample {
  id: number;
  speaker_id: number;
  speaker_name: string;
  accent_profile_id: number | null;
  accent_profile_name: string | null;
  audio_resource_id: number;
  project_id: number | null;
  quality_rating: number | null;
  accent_strength: number | null;
  is_curated: boolean;
  tags: string[];
  notes: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  sample_count: number;
}

// --- Import types (Unit 5) ---

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

// --- Common Voice types ---

export interface CommonVoiceImportRequest {
  directory: string;
  locale?: string;
  limit?: number;
}

export interface CommonVoiceStatusResponse {
  active: boolean;
  job: ImportJob | null;
}

// --- Speech Accent Archive types ---

export interface SpeechAccentArchiveSyncResponse {
  id: number;
  source: string;
  status: string;
  total_entries: number;
  processed_entries: number;
  error_message: string | null;
  created_at: string;
}

// --- Discovery types (Unit 6) ---

export interface AccentProfileSummary {
  id: number;
  name: string;
  description: string;
  region_id: number | null;
  region_name: string | null;
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

// --- Phoneme Inventory types ---

export interface PhonemeInventory {
  id: number;
  inventory_id: number;
  language_name: string;
  iso639_3: string | null;
  glottocode: string | null;
  source_dataset: string | null;
  consonants: string[];
  vowels: string[];
  tones: string[];
  total_segments: number;
  created_at: string;
}

// --- Forvo / Settings types ---

export interface AppSetting {
  key: string;
  value: string;
  is_secret: boolean;
}

export interface ForvoLookupRequest {
  word: string;
  language: string;
}

export interface ForvoResult {
  samples: SpeakerSample[];
  count: number;
}

export interface DiscoveryStats {
  total_speakers: number;
  total_samples: number;
  total_profiles: number;
  total_regions: number;
}
