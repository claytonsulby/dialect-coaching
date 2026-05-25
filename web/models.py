from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Index, Integer, String, Table, Text
from sqlalchemy.orm import backref, relationship

from web.database import Base

project_actor = Table(
    "project_actor",
    Base.metadata,
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("actor_id", Integer, ForeignKey("actors.id", ondelete="CASCADE"), primary_key=True),
)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    actors = relationship("Actor", secondary=project_actor, back_populates="projects")
    audio_resources = relationship("AudioResource", back_populates="project", cascade="all, delete-orphan")


class Actor(Base):
    __tablename__ = "actors"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    notes = Column(Text, default="")
    speaker_id = Column(Integer, ForeignKey("speakers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    projects = relationship("Project", secondary=project_actor, back_populates="actors")
    speaker = relationship("Speaker")


class AudioResource(Base):
    __tablename__ = "audio_resources"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(Integer, ForeignKey("actors.id", ondelete="SET NULL"), nullable=True)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    duration = Column(Float, nullable=True)
    status = Column(Enum("pending", "processing", "ready", "error", name="audio_status"), default="pending")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="audio_resources")
    actor = relationship("Actor")
    segments = relationship("Segment", back_populates="audio_resource", cascade="all, delete-orphan",
                            order_by="Segment.segment_index")


class Segment(Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True)
    audio_resource_id = Column(Integer, ForeignKey("audio_resources.id", ondelete="CASCADE"), nullable=False)
    segment_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    expected_phonemes = Column(Text, default="")
    actual_phonemes = Column(Text, default="")
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)

    audio_resource = relationship("AudioResource", back_populates="segments")
    words = relationship("Word", back_populates="segment", cascade="all, delete-orphan",
                         order_by="Word.word_index")


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True)
    segment_id = Column(Integer, ForeignKey("segments.id", ondelete="CASCADE"), nullable=False)
    word_index = Column(Integer, nullable=False)
    word = Column(String, nullable=False)
    expected_phonemes = Column(String, default="")
    actual_phonemes = Column(String, default="")

    segment = relationship("Segment", back_populates="words")
    phone_changes = relationship("PhoneChange", back_populates="word", cascade="all, delete-orphan")


class PhoneChange(Base):
    __tablename__ = "phone_changes"

    id = Column(Integer, primary_key=True)
    word_id = Column(Integer, ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    expected_phone = Column(String, nullable=False)
    actual_phone = Column(String, nullable=False)

    word = relationship("Word", back_populates="phone_changes")


# --- Geographic Taxonomy (Unit 1) ---

class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    region_type = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("regions.id", ondelete="CASCADE"), nullable=True)
    path = Column(String, nullable=False)
    iso_code = Column(String, nullable=True)
    source = Column(String, default="manual")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    parent = relationship("Region", remote_side="Region.id", backref=backref("children", passive_deletes=True))

    __table_args__ = (
        Index("ix_regions_path", "path"),
    )


# --- Speaker Demographics (Unit 2) ---

class Speaker(Base):
    __tablename__ = "speakers"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    origin_region_id = Column(Integer, ForeignKey("regions.id", ondelete="SET NULL"), nullable=True)
    age_range = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    ethnicity = Column(String, nullable=True)
    socioeconomic_status = Column(String, nullable=True)
    notes = Column(Text, default="")
    source = Column(String, default="local")
    external_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    origin_region = relationship("Region")


# --- Accent Profiles & Signatures (Unit 3) ---

class AccentProfile(Base):
    __tablename__ = "accent_profiles"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    region_id = Column(Integer, ForeignKey("regions.id", ondelete="SET NULL"), nullable=True)
    source = Column(String, default="manual")
    sample_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    region = relationship("Region")
    patterns = relationship("SignaturePattern", back_populates="accent_profile",
                            cascade="all, delete-orphan")


class SignaturePattern(Base):
    __tablename__ = "signature_patterns"

    id = Column(Integer, primary_key=True)
    accent_profile_id = Column(Integer, ForeignKey("accent_profiles.id", ondelete="CASCADE"), nullable=False)
    expected_phone = Column(String, nullable=False)
    actual_phone = Column(String, nullable=False)
    frequency = Column(Float, default=0.0)
    occurrence_count = Column(Integer, default=0)
    notes = Column(Text, default="")

    accent_profile = relationship("AccentProfile", back_populates="patterns")


# --- Sample Collection & Tags (Unit 4) ---

sample_tag = Table(
    "sample_tag",
    Base.metadata,
    Column("sample_id", Integer, ForeignKey("speaker_samples.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)

    samples = relationship("SpeakerSample", secondary=sample_tag, back_populates="tags")


class SpeakerSample(Base):
    __tablename__ = "speaker_samples"

    id = Column(Integer, primary_key=True)
    speaker_id = Column(Integer, ForeignKey("speakers.id", ondelete="CASCADE"), nullable=False)
    accent_profile_id = Column(Integer, ForeignKey("accent_profiles.id", ondelete="SET NULL"), nullable=True)
    audio_resource_id = Column(Integer, ForeignKey("audio_resources.id", ondelete="CASCADE"), nullable=False)
    quality_rating = Column(Integer, nullable=True)
    accent_strength = Column(Float, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    is_curated = Column(Integer, default=0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    speaker = relationship("Speaker")
    project = relationship("Project")
    accent_profile = relationship("AccentProfile")
    audio_resource = relationship("AudioResource")
    tags = relationship("Tag", secondary=sample_tag, back_populates="samples")


# --- External Corpus Integration (Unit 5) ---

class PhonemeInventory(Base):
    __tablename__ = "phoneme_inventories"

    id = Column(Integer, primary_key=True)
    inventory_id = Column(Integer, nullable=False)
    language_name = Column(String, nullable=False)
    iso639_3 = Column(String, nullable=True)
    glottocode = Column(String, nullable=True)
    source_dataset = Column(String, nullable=True)
    consonants_json = Column(Text, default="[]")
    vowels_json = Column(Text, default="[]")
    tones_json = Column(Text, default="[]")
    total_segments = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_phoneme_inventories_iso", "iso639_3"),
        Index("ix_phoneme_inventories_inv_id", "inventory_id", unique=True),
    )


class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True)
    key = Column(String, nullable=False, unique=True)
    value = Column(Text, default="")
    is_secret = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True)
    source = Column(String, nullable=False)
    status = Column(String, default="pending")
    total_entries = Column(Integer, default=0)
    processed_entries = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
