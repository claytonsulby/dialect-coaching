import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session, joinedload

from web.database import DATA_DIR, get_db
from web.models import AudioResource, Segment, Word
from web.schemas import AudioDetailResponse, AudioResponse, ExportRequest, SegmentResponse
from web.services.export import export_audio, export_report
from web.services.transcription import run_transcription

router = APIRouter(prefix="/api", tags=["audio"])

executor = ThreadPoolExecutor(max_workers=2)

AUDIO_DIR = DATA_DIR / "audio"


@router.get("/projects/{project_id}/audio", response_model=list[AudioResponse])
def list_audio(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(AudioResource)
        .filter(AudioResource.project_id == project_id)
        .order_by(AudioResource.created_at.desc())
        .all()
    )


@router.post("/projects/{project_id}/audio", response_model=AudioResponse, status_code=201)
async def upload_audio(project_id: int, file: UploadFile, actor_id: int | None = None, db: Session = Depends(get_db)):
    ext = Path(file.filename or "audio.wav").suffix
    stored = f"{uuid.uuid4().hex}{ext}"
    dest = AUDIO_DIR / stored
    content = await file.read()
    dest.write_bytes(content)

    audio = AudioResource(
        project_id=project_id,
        actor_id=actor_id,
        original_filename=file.filename or "audio",
        stored_filename=stored,
        status="pending",
    )
    db.add(audio)
    db.commit()
    db.refresh(audio)
    return audio


@router.get("/audio/{audio_id}", response_model=AudioDetailResponse)
def get_audio(audio_id: int, db: Session = Depends(get_db)):
    audio = (
        db.query(AudioResource)
        .options(
            joinedload(AudioResource.segments)
            .joinedload(Segment.words)
            .joinedload(Word.phone_changes)
        )
        .filter(AudioResource.id == audio_id)
        .first()
    )
    if not audio:
        raise HTTPException(404, "Audio not found")
    return audio


@router.get("/audio/{audio_id}/file")
def serve_audio(audio_id: int, db: Session = Depends(get_db)):
    audio = db.get(AudioResource, audio_id)
    if not audio:
        raise HTTPException(404, "Audio not found")
    path = AUDIO_DIR / audio.stored_filename
    if not path.exists():
        raise HTTPException(404, "Audio file missing")
    media_type = "audio/mpeg" if path.suffix == ".mp3" else f"audio/{path.suffix.lstrip('.')}"
    return FileResponse(path, media_type=media_type)


@router.post("/audio/{audio_id}/transcribe", response_model=AudioResponse)
def transcribe_audio(audio_id: int, model: str = "base", db: Session = Depends(get_db)):
    audio = db.get(AudioResource, audio_id)
    if not audio:
        raise HTTPException(404, "Audio not found")
    if audio.status == "processing":
        raise HTTPException(409, "Already processing")

    db.query(Segment).filter(Segment.audio_resource_id == audio_id).delete()
    audio.status = "pending"
    audio.error_message = None
    db.commit()
    db.refresh(audio)

    audio_path = AUDIO_DIR / audio.stored_filename
    executor.submit(run_transcription, audio_id, audio_path, model)

    return audio


@router.get("/audio/{audio_id}/segments", response_model=list[SegmentResponse])
def get_segments(audio_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Segment)
        .options(joinedload(Segment.words).joinedload(Word.phone_changes))
        .filter(Segment.audio_resource_id == audio_id)
        .order_by(Segment.segment_index)
        .all()
    )


@router.post("/audio/{audio_id}/export")
def export_selection(audio_id: int, req: ExportRequest, db: Session = Depends(get_db)):
    audio = db.get(AudioResource, audio_id)
    if not audio:
        raise HTTPException(404, "Audio not found")

    audio_path = AUDIO_DIR / audio.stored_filename
    if not audio_path.exists():
        raise HTTPException(404, "Audio file missing")

    if req.segment_ids or req.time_ranges:
        wav_bytes = export_audio(db, audio_path, req.segment_ids, req.time_ranges)
    else:
        wav_bytes = b""

    all_segments = (
        db.query(Segment)
        .options(joinedload(Segment.words).joinedload(Word.phone_changes))
        .filter(Segment.audio_resource_id == audio_id)
        .order_by(Segment.segment_index)
        .all()
    )
    report = export_report(db, req.segment_ids, req.time_ranges, all_segments)

    return {
        "report": report,
        "has_audio": len(wav_bytes) > 0,
    }


@router.post("/audio/{audio_id}/export/audio")
def export_audio_file(audio_id: int, req: ExportRequest, db: Session = Depends(get_db)):
    audio = db.get(AudioResource, audio_id)
    if not audio:
        raise HTTPException(404, "Audio not found")

    audio_path = AUDIO_DIR / audio.stored_filename
    wav_bytes = export_audio(db, audio_path, req.segment_ids, req.time_ranges)
    if not wav_bytes:
        raise HTTPException(400, "No audio to export")

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": f'attachment; filename="export_{audio.original_filename}.wav"'},
    )


@router.delete("/audio/{audio_id}", status_code=204)
def delete_audio(audio_id: int, db: Session = Depends(get_db)):
    audio = db.get(AudioResource, audio_id)
    if not audio:
        raise HTTPException(404, "Audio not found")
    path = AUDIO_DIR / audio.stored_filename
    if path.exists():
        path.unlink()
    db.delete(audio)
    db.commit()
