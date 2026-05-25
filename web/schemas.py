from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ActorBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    actors: list[ActorBrief] = []
    audio_count: int = 0

    model_config = {"from_attributes": True}


class ActorCreate(BaseModel):
    name: str
    notes: str = ""


class ActorUpdate(BaseModel):
    name: str | None = None
    notes: str | None = None


class ProjectBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ActorResponse(BaseModel):
    id: int
    name: str
    notes: str
    created_at: datetime
    projects: list[ProjectBrief] = []

    model_config = {"from_attributes": True}


class PhoneChangeResponse(BaseModel):
    id: int
    expected_phone: str
    actual_phone: str

    model_config = {"from_attributes": True}


class WordResponse(BaseModel):
    id: int
    word_index: int
    word: str
    expected_phonemes: str
    actual_phonemes: str
    phone_changes: list[PhoneChangeResponse] = []

    model_config = {"from_attributes": True}


class SegmentResponse(BaseModel):
    id: int
    segment_index: int
    text: str
    expected_phonemes: str
    actual_phonemes: str
    start_time: float
    end_time: float
    words: list[WordResponse] = []

    model_config = {"from_attributes": True}


class AudioResponse(BaseModel):
    id: int
    project_id: int
    actor_id: int | None
    original_filename: str
    duration: float | None
    status: str
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AudioDetailResponse(AudioResponse):
    segments: list[SegmentResponse] = []


class ExportRequest(BaseModel):
    segment_ids: list[int] = []
    time_ranges: list[tuple[float, float]] = []


# --- Region schemas (Unit 1) ---

class RegionCreate(BaseModel):
    name: str
    region_type: str = "custom"
    parent_id: int | None = None


class RegionUpdate(BaseModel):
    name: str | None = None
    region_type: str | None = None


class RegionBrief(BaseModel):
    id: int
    name: str
    region_type: str
    path: str
    source: str

    model_config = {"from_attributes": True}


class RegionResponse(BaseModel):
    id: int
    name: str
    region_type: str
    path: str
    iso_code: str | None
    parent_id: int | None
    source: str
    children: list[RegionBrief] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class RegionSearchResult(BaseModel):
    id: int
    name: str
    region_type: str
    path: str
    iso_code: str | None
    parent_id: int | None

    model_config = {"from_attributes": True}


# --- Speaker schemas (Unit 2) ---

class SpeakerCreate(BaseModel):
    name: str
    origin_region_id: int | None = None
    age_range: str | None = None
    gender: str | None = None
    ethnicity: str | None = None
    socioeconomic_status: str | None = None
    notes: str = ""
    source: str = "local"
    external_id: str | None = None


class SpeakerUpdate(BaseModel):
    name: str | None = None
    origin_region_id: int | None = None
    age_range: str | None = None
    gender: str | None = None
    ethnicity: str | None = None
    socioeconomic_status: str | None = None
    notes: str | None = None


class SpeakerResponse(BaseModel):
    id: int
    name: str
    origin_region_id: int | None
    age_range: str | None
    gender: str | None
    ethnicity: str | None
    socioeconomic_status: str | None
    notes: str
    source: str
    external_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Accent Profile schemas (Unit 3) ---

class SignaturePatternCreate(BaseModel):
    expected_phone: str
    actual_phone: str
    frequency: float = 0.0
    notes: str = ""


class SignaturePatternUpdate(BaseModel):
    expected_phone: str | None = None
    actual_phone: str | None = None
    frequency: float | None = None
    notes: str | None = None


class SignaturePatternResponse(BaseModel):
    id: int
    expected_phone: str
    actual_phone: str
    frequency: float
    occurrence_count: int
    notes: str

    model_config = {"from_attributes": True}


class AccentProfileCreate(BaseModel):
    name: str
    description: str = ""
    region_id: int | None = None
    patterns: list[SignaturePatternCreate] = []


class AccentProfileUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    region_id: int | None = None


class AccentProfileResponse(BaseModel):
    id: int
    name: str
    description: str
    region_id: int | None
    source: str
    sample_count: int
    patterns: list[SignaturePatternResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class AccentComparisonResponse(BaseModel):
    profile_a: AccentProfileResponse
    profile_b: AccentProfileResponse
    shared_patterns: list[dict]
    unique_to_a: list[dict]
    unique_to_b: list[dict]


# --- Sample & Tag schemas (Unit 4) ---

class TagResponse(BaseModel):
    id: int
    name: str
    sample_count: int = 0

    model_config = {"from_attributes": True}


class SampleCreate(BaseModel):
    speaker_id: int
    audio_resource_id: int
    accent_profile_id: int | None = None
    quality_rating: int | None = None
    tags: list[str] = []
    notes: str = ""


class SampleUpdate(BaseModel):
    accent_profile_id: int | None = None
    quality_rating: int | None = None
    is_curated: bool | None = None
    tags: list[str] | None = None
    notes: str | None = None


class SampleResponse(BaseModel):
    id: int
    speaker_id: int
    speaker_name: str = ""
    accent_profile_id: int | None
    accent_profile_name: str | None = None
    audio_resource_id: int
    quality_rating: int | None
    accent_strength: float | None
    is_curated: bool
    tags: list[str] = []
    notes: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Import schemas (Unit 5) ---

class ImportEntry(BaseModel):
    speaker_name: str = ""
    audio_url: str = ""
    region_path: str = ""
    external_id: str = ""
    age_range: str | None = None
    gender: str | None = None
    ethnicity: str | None = None
    socioeconomic_status: str | None = None
    notes: str = ""


class ImportRequest(BaseModel):
    entries: list[ImportEntry]


class ImportJobResponse(BaseModel):
    id: int
    source: str
    status: str
    total_entries: int
    processed_entries: int
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Discovery schemas (Unit 6) ---

class DiscoveryResult(BaseModel):
    speakers: list[dict] = []
    samples: list[dict] = []
    profiles: list[dict] = []
    total_count: int = 0


class DiscoveryStats(BaseModel):
    total_speakers: int = 0
    total_samples: int = 0
    total_profiles: int = 0
    total_regions: int = 0
