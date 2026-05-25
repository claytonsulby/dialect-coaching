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


# ---------------------------------------------------------------------------
# Import schemas
# ---------------------------------------------------------------------------

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
