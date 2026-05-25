"""Forvo pronunciation API client."""

import hashlib
import logging
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from web.database import DATA_DIR
from web.models import AppSetting, AudioResource, Project, Speaker, SpeakerSample

logger = logging.getLogger(__name__)

FORVO_API_BASE = "https://apifree.forvo.com"


def _get_api_key(db: Session) -> str | None:
    setting = db.query(AppSetting).filter(AppSetting.key == "forvo_api_key").first()
    if setting and setting.value:
        return setting.value
    return None


def _get_or_create_forvo_project(db: Session) -> Project:
    project = db.query(Project).filter(Project.name == "[FORVO Imports]").first()
    if not project:
        project = Project(name="[FORVO Imports]", description="Auto-created project for Forvo pronunciation imports")
        db.add(project)
        db.commit()
        db.refresh(project)
    return project


def _get_or_create_speaker(db: Session, username: str, country: str) -> Speaker:
    speaker = db.query(Speaker).filter(
        Speaker.source == "forvo",
        Speaker.external_id == username,
    ).first()
    if not speaker:
        speaker = Speaker(
            name=username,
            source="forvo",
            external_id=username,
            notes=f"Forvo contributor from {country}",
        )
        db.add(speaker)
        db.commit()
        db.refresh(speaker)
    return speaker


def _download_audio(url: str, word: str, username: str) -> str | None:
    """Download MP3 from Forvo, return stored filename."""
    audio_dir = DATA_DIR / "audio"
    audio_dir.mkdir(exist_ok=True)

    url_hash = hashlib.md5(url.encode()).hexdigest()[:10]
    filename = f"forvo_{word}_{username}_{url_hash}.mp3"
    filepath = audio_dir / filename

    if filepath.exists():
        return filename

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DialectCoaching/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            filepath.write_bytes(resp.read())
        return filename
    except Exception as e:
        logger.error("Failed to download Forvo audio %s: %s", url, e)
        return None


def lookup_word(db: Session, word: str, language: str = "en") -> list[dict]:
    """Look up a word on Forvo and create Speaker/AudioResource/SpeakerSample records."""
    import json

    api_key = _get_api_key(db)
    if not api_key:
        raise ValueError("Forvo API key not configured")

    url = f"{FORVO_API_BASE}/action/word-pronunciations/format/json/word/{word}/language/{language}/key/{api_key}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DialectCoaching/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        logger.error("Forvo API request failed: %s", e)
        raise ValueError(f"Forvo API request failed: {e}")

    items = data.get("items", [])
    if not items:
        return []

    project = _get_or_create_forvo_project(db)
    created_samples = []

    for item in items:
        username = item.get("username", "unknown")
        country = item.get("country", "")
        mp3_url = item.get("pathmp3", "")

        if not mp3_url:
            continue

        stored_filename = _download_audio(mp3_url, word, username)
        if not stored_filename:
            continue

        speaker = _get_or_create_speaker(db, username, country)

        audio = AudioResource(
            project_id=project.id,
            original_filename=f"{word}_{username}.mp3",
            stored_filename=stored_filename,
            status="ready",
        )
        db.add(audio)
        db.commit()
        db.refresh(audio)

        sample = SpeakerSample(
            speaker_id=speaker.id,
            audio_resource_id=audio.id,
            notes=f"Forvo pronunciation of '{word}' by {username} ({country})",
        )
        db.add(sample)
        db.commit()
        db.refresh(sample)

        created_samples.append({
            "id": sample.id,
            "speaker_id": speaker.id,
            "speaker_name": speaker.name,
            "accent_profile_id": None,
            "accent_profile_name": None,
            "audio_resource_id": audio.id,
            "quality_rating": None,
            "accent_strength": None,
            "is_curated": False,
            "tags": [],
            "notes": sample.notes,
            "created_at": sample.created_at.isoformat() if sample.created_at else "",
        })

    return created_samples
