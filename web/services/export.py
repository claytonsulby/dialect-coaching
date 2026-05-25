import io
from collections import Counter
from pathlib import Path

from pydub import AudioSegment
from sqlalchemy.orm import Session, joinedload

from web.models import Segment, Word


def export_audio(
    db: Session,
    audio_path: Path,
    segment_ids: list[int],
    time_ranges: list[tuple[float, float]],
) -> bytes:
    source = AudioSegment.from_file(str(audio_path))
    parts: list[AudioSegment] = []

    if segment_ids:
        segs = (
            db.query(Segment)
            .filter(Segment.id.in_(segment_ids))
            .order_by(Segment.segment_index)
            .all()
        )
        id_order = {sid: i for i, sid in enumerate(segment_ids)}
        segs.sort(key=lambda s: id_order.get(s.id, 0))

        for seg in segs:
            start_ms = int(seg.start_time * 1000)
            end_ms = int(seg.end_time * 1000)
            parts.append(source[start_ms:end_ms])

    for start, end in time_ranges:
        start_ms = int(start * 1000)
        end_ms = int(end * 1000)
        parts.append(source[start_ms:end_ms])

    if not parts:
        return b""

    combined = parts[0]
    for part in parts[1:]:
        combined = combined.append(part, crossfade=min(50, len(part) // 2))

    buf = io.BytesIO()
    combined.export(buf, format="wav")
    return buf.getvalue()


def export_report(
    db: Session,
    segment_ids: list[int],
    time_ranges: list[tuple[float, float]],
    all_segments: list[Segment],
) -> dict:
    segments: list[Segment] = []

    if segment_ids:
        found = (
            db.query(Segment)
            .options(joinedload(Segment.words).joinedload(Word.phone_changes))
            .filter(Segment.id.in_(segment_ids))
            .all()
        )
        by_id = {s.id: s for s in found}
        for sid in segment_ids:
            if sid in by_id:
                segments.append(by_id[sid])

    for start, end in time_ranges:
        for seg in all_segments:
            if seg.start_time >= start and seg.end_time <= end:
                if seg.id not in {s.id for s in segments}:
                    segments.append(seg)

    lines = []
    phone_counts: Counter[tuple[str, str]] = Counter()
    word_details = []

    for seg in segments:
        lines.append(seg.text)
        lines.append(f"  Standard: /{seg.expected_phonemes}/")
        lines.append(f"  Heard:    /{seg.actual_phonemes}/")

        for word in seg.words:
            if word.phone_changes:
                changes_str = ", ".join(
                    f"{c.expected_phone}→{c.actual_phone}" for c in word.phone_changes
                )
                lines.append(f"    {word.word}: /{word.expected_phonemes}/ → /{word.actual_phonemes}/  [{changes_str}]")
                word_details.append({
                    "word": word.word,
                    "expected": word.expected_phonemes,
                    "actual": word.actual_phonemes,
                    "changes": [
                        {"from": c.expected_phone, "to": c.actual_phone}
                        for c in word.phone_changes
                    ],
                })
                for c in word.phone_changes:
                    phone_counts[(c.expected_phone, c.actual_phone)] += 1
        lines.append("")

    summary = []
    if phone_counts:
        lines.append("=" * 40)
        lines.append("ACCENT SUMMARY")
        lines.append("=" * 40)
        for (exp, act), count in phone_counts.most_common():
            if count >= 2:
                lines.append(f"  /{exp}/ → /{act}/  ({count}×)")
                summary.append({"from": exp, "to": act, "count": count})

    return {
        "text": "\n".join(lines),
        "json": {
            "segments": [
                {
                    "text": seg.text,
                    "expected_phonemes": seg.expected_phonemes,
                    "actual_phonemes": seg.actual_phonemes,
                    "start": seg.start_time,
                    "end": seg.end_time,
                }
                for seg in segments
            ],
            "word_changes": word_details,
            "accent_summary": summary,
        },
    }
