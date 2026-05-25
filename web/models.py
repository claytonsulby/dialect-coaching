from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import relationship

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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    projects = relationship("Project", secondary=project_actor, back_populates="actors")


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


class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    region_type = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("regions.id", ondelete="CASCADE"), nullable=True)
    path = Column(String, nullable=False, index=True)
    iso_code = Column(String, nullable=True)
    is_seed = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    parent = relationship("Region", remote_side="Region.id", backref="children")


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
