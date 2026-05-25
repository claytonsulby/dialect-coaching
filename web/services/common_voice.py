import csv
import shutil
import uuid
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
from pathlib import Path

from sqlalchemy.orm import Session

from web.database import DATA_DIR, SessionLocal
from web.models import (
    AccentProfile,
    AudioResource,
    ImportJob,
    Project,
    Speaker,
    SpeakerSample,
)

AUDIO_DIR = DATA_DIR / "audio"
executor = ThreadPoolExecutor(max_workers=2)

# Map Common Voice age values to app age_range values
CV_AGE_MAP = {
    "teens": "13-19",
    "twenties": "20-29",
    "thirties": "30-39",
    "fourties": "40-49",
    "fifties": "50-59",
    "sixties": "60-69",
    "seventies": "70-79",
    "eighties": "80-89",
    "nineties": "90-99",
}


def start_common_voice_import(job_id: int, directory: str, locale: str, limit: int):
    """Queue a background Common Voice import job."""
    executor.submit(_run_import, job_id, directory, locale, limit)


def _fuzzy_match_accent(db: Session, accent_str: str) -> int | None:
    """Try to match a CV accents string to an existing AccentProfile by fuzzy name match."""
    if not accent_str or not accent_str.strip():
        return None
    accent_str = accent_str.strip().lower()
    profiles = db.query(AccentProfile).all()
    best_match = None
    best_ratio = 0.0
    for profile in profiles:
        ratio = SequenceMatcher(None, accent_str, profile.name.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = profile
    if best_ratio >= 0.6 and best_match:
        return best_match.id
    return None


def _run_import(job_id: int, directory: str, locale: str, limit: int):
    db: Session = SessionLocal()
    try:
        job = db.get(ImportJob, job_id)
        if not job:
            return
        job.status = "processing"
        db.commit()

        dataset_dir = Path(directory)
        tsv_path = dataset_dir / "validated.tsv"
        clips_dir = dataset_dir / "clips"

        if not dataset_dir.exists():
            job.status = "error"
            job.error_message = f"Directory does not exist: {directory}"
            db.commit()
            return

        if not tsv_path.exists():
            job.status = "error"
            job.error_message = f"validated.tsv not found in {directory}"
            db.commit()
            return

        # Read TSV entries
        with open(tsv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t")
            rows = []
            for row in reader:
                rows.append(row)
                if len(rows) >= limit:
                    break

        job.total_entries = len(rows)
        db.commit()

        # Get or create sentinel project
        project_name = "[COMMON_VOICE Imports]"
        imports_project = db.query(Project).filter(Project.name == project_name).first()
        if not imports_project:
            imports_project = Project(
                name=project_name,
                description="Auto-created for Common Voice corpus imports",
            )
            db.add(imports_project)
            db.flush()

        for i, row in enumerate(rows):
            try:
                _import_row(db, row, clips_dir, imports_project.id)
                job.processed_entries = i + 1
                db.commit()
            except Exception as e:
                db.rollback()
                job = db.get(ImportJob, job_id)
                imports_project = db.query(Project).filter(Project.name == project_name).first()
                job.error_message = (job.error_message or "") + f"\nEntry {i}: {str(e)}"
                job.processed_entries = i + 1
                db.commit()

        job.status = "completed"
        db.commit()
    except Exception as e:
        try:
            job = db.get(ImportJob, job_id)
            if job:
                job.status = "error"
                job.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _import_row(db: Session, row: dict, clips_dir: Path, project_id: int):
    """Import a single Common Voice TSV row."""
    client_id = row.get("client_id", "")
    source = "common_voice"

    # Deduplicate speaker by client_id + source
    speaker = None
    if client_id:
        speaker = (
            db.query(Speaker)
            .filter(Speaker.source == source, Speaker.external_id == client_id)
            .first()
        )

    if not speaker:
        age_range = CV_AGE_MAP.get(row.get("age", ""), row.get("age") or None)
        gender = row.get("gender") or None
        speaker = Speaker(
            name=f"CV Speaker {client_id[:8]}" if client_id else "Unknown (common_voice)",
            age_range=age_range,
            gender=gender,
            source=source,
            external_id=client_id or None,
        )
        db.add(speaker)
        db.flush()

    # Copy audio file
    audio_filename = row.get("path", "")
    if not audio_filename:
        return

    src_path = clips_dir / audio_filename
    if not src_path.exists():
        # Try with .mp3 extension if not already present
        if not audio_filename.endswith(".mp3"):
            src_path = clips_dir / f"{audio_filename}.mp3"
        if not src_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_filename}")

    ext = src_path.suffix or ".mp3"
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    dest = AUDIO_DIR / stored_filename
    shutil.copy2(str(src_path), str(dest))

    audio = AudioResource(
        project_id=project_id,
        original_filename=audio_filename,
        stored_filename=stored_filename,
        status="pending",
    )
    db.add(audio)
    db.flush()

    # Fuzzy match accent
    accent_profile_id = _fuzzy_match_accent(db, row.get("accents", ""))

    sentence = row.get("sentence", "")
    sample = SpeakerSample(
        speaker_id=speaker.id,
        audio_resource_id=audio.id,
        accent_profile_id=accent_profile_id,
        notes=f"Imported from Common Voice. Sentence: {sentence}",
    )
    db.add(sample)
    db.flush()
