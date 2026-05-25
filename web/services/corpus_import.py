import uuid
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from web.database import SessionLocal, DATA_DIR
from web.models import AudioResource, ImportJob, Project, Region, Speaker, SpeakerSample

AUDIO_DIR = DATA_DIR / "audio"
executor = ThreadPoolExecutor(max_workers=2)


def start_import(job_id: int, entries: list[dict], source: str):
    """Queue a background import job."""
    executor.submit(_run_import, job_id, entries, source)


def _run_import(job_id: int, entries: list[dict], source: str):
    db: Session = SessionLocal()
    try:
        job = db.get(ImportJob, job_id)
        if not job:
            return
        job.status = "processing"
        job.total_entries = len(entries)
        db.commit()

        for i, entry in enumerate(entries):
            try:
                _import_entry(db, entry, source)
                job.processed_entries = i + 1
                db.commit()
            except Exception as e:
                db.rollback()
                job = db.get(ImportJob, job_id)
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


def _import_entry(db: Session, entry: dict, source: str):
    """Import a single entry: create/find speaker, download audio, create sample."""
    # Deduplicate speaker by source + external_id
    external_id = entry.get("external_id", "")
    speaker = None
    if external_id:
        speaker = db.query(Speaker).filter(
            Speaker.source == source,
            Speaker.external_id == external_id,
        ).first()

    if not speaker:
        # Find region by path if provided
        region_id = None
        if entry.get("region_path"):
            region = db.query(Region).filter(Region.path == entry["region_path"]).first()
            if region:
                region_id = region.id

        speaker = Speaker(
            name=entry.get("speaker_name", f"Unknown ({source})"),
            origin_region_id=region_id,
            age_range=entry.get("age_range"),
            gender=entry.get("gender"),
            ethnicity=entry.get("ethnicity"),
            socioeconomic_status=entry.get("socioeconomic_status"),
            notes=entry.get("notes", ""),
            source=source,
            external_id=external_id or None,
        )
        db.add(speaker)
        db.flush()

    # Download audio if URL provided
    audio_url = entry.get("audio_url", "")
    if not audio_url:
        return

    parsed_url = urlparse(audio_url)
    url_path = Path(parsed_url.path)
    ext = url_path.suffix or ".mp3"
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    dest = AUDIO_DIR / stored_filename

    urllib.request.urlretrieve(audio_url, str(dest))

    # Create AudioResource (project_id is required, use a sentinel "imports" project)
    imports_project = db.query(Project).filter(Project.name == f"[{source.upper()} Imports]").first()
    if not imports_project:
        imports_project = Project(name=f"[{source.upper()} Imports]", description=f"Auto-created for {source} corpus imports")
        db.add(imports_project)
        db.flush()

    original_filename = url_path.name or f"{source}_audio{ext}"
    audio = AudioResource(
        project_id=imports_project.id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        status="pending",
    )
    db.add(audio)
    db.flush()

    # Create SpeakerSample
    sample = SpeakerSample(
        speaker_id=speaker.id,
        audio_resource_id=audio.id,
        notes=f"Imported from {source}",
    )
    db.add(sample)
    db.flush()
