import sys
from pathlib import Path

from sqlalchemy.orm import Session

from web.database import SessionLocal
from web.models import AudioResource, PhoneChange, Segment, Word

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "src"))
from dialect_coaching.transcriber import transcribe_aligned  # noqa: E402


def run_transcription(audio_id: int, audio_path: Path, whisper_size: str = "base"):
    db: Session = SessionLocal()
    try:
        audio = db.get(AudioResource, audio_id)
        if not audio:
            return
        audio.status = "processing"
        db.commit()

        try:
            segments = transcribe_aligned(audio_path, whisper_size=whisper_size)
        except Exception as e:
            audio.status = "error"
            audio.error_message = str(e)
            db.commit()
            return

        if segments:
            audio.duration = segments[-1].end

        for si, seg in enumerate(segments):
            db_seg = Segment(
                audio_resource_id=audio_id,
                segment_index=si,
                text=seg.text,
                expected_phonemes=seg.expected_phonemes,
                actual_phonemes=seg.actual_phonemes,
                start_time=seg.start,
                end_time=seg.end,
            )
            db.add(db_seg)
            db.flush()

            for wi, w in enumerate(seg.words):
                db_word = Word(
                    segment_id=db_seg.id,
                    word_index=wi,
                    word=w.word,
                    expected_phonemes=w.expected,
                    actual_phonemes=w.actual,
                )
                db.add(db_word)
                db.flush()

                for am in seg.accent_map:
                    if am.word == w.word:
                        for c in am.changes:
                            db.add(PhoneChange(
                                word_id=db_word.id,
                                expected_phone=c.expected,
                                actual_phone=c.actual,
                            ))

        audio.status = "ready"
        db.commit()
    except Exception as e:
        db.rollback()
        try:
            audio = db.get(AudioResource, audio_id)
            if audio:
                audio.status = "error"
                audio.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
