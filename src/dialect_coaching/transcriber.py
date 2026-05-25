import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class WordPhoneme:
    word: str
    phonemes: str


@dataclass
class AlignedSegment:
    text: str
    phonemes: str
    words: list[WordPhoneme] = field(default_factory=list)
    start: float = 0.0
    end: float = 0.0


def _run_whisper(audio_path: Path, model_size: str) -> list[dict]:
    script = f"""
import json
from faster_whisper import WhisperModel
model = WhisperModel({model_size!r}, compute_type="int8")
segs, _ = model.transcribe({str(audio_path)!r}, word_timestamps=True, language="en")
result = []
for s in segs:
    words = []
    if s.words:
        words = [{{"word": w.word.strip(), "start": w.start, "end": w.end}} for w in s.words]
    result.append({{"start": s.start, "end": s.end, "text": s.text.strip(), "words": words}})
print(json.dumps(result))
"""
    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True, text=True,
        env={**__import__("os").environ, "KMP_DUPLICATE_LIB_OK": "TRUE"},
    )
    if result.returncode != 0:
        raise RuntimeError(f"Whisper failed: {result.stderr}")
    return json.loads(result.stdout)


def _run_phonemes(audio_path: Path, segments: list[dict]) -> list[str]:
    """Run phoneme recognition: full-segment CTC decode with gap-based word breaks.
    Pure audio — no dictionary, no forced alignment."""
    segments_json = json.dumps(segments)
    script = f"""
import json
import numpy as np
import soundfile as sf
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

MODEL_ID = "facebook/wav2vec2-lv-60-espeak-cv-ft"
proc = Wav2Vec2Processor.from_pretrained(MODEL_ID)
model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID, use_safetensors=True)

data, sr = sf.read({str(audio_path)!r}, dtype="float32")
if len(data.shape) > 1:
    data = data.mean(axis=1)
if sr != 16000:
    dur = len(data) / sr
    n = int(dur * 16000)
    data = np.interp(np.linspace(0, len(data) - 1, n), np.arange(len(data)), data).astype(np.float32)
    sr = 16000

segments = json.loads({segments_json!r})

def ctc_decode_positioned(logits_slice):
    pred_ids = torch.argmax(logits_slice, dim=-1).tolist()
    prev = -1
    phones = []
    for fi, pid in enumerate(pred_ids):
        if pid == 0 or pid == prev:
            prev = pid
            continue
        token = proc.tokenizer.decode([pid]).strip()
        if token:
            phones.append((fi, token))
        prev = pid
    return phones

all_results = []

for seg in segments:
    seg_start = seg["start"]
    seg_end = seg["end"]
    start_sample = int(seg_start * sr)
    end_sample = int(seg_end * sr)
    audio = data[start_sample:end_sample]

    if len(audio) < 400:
        all_results.append("")
        continue

    inputs = proc(audio, sampling_rate=sr, return_tensors="pt", padding=True)
    with torch.no_grad():
        logits = model(**inputs).logits[0]

    n_frames = logits.shape[0]
    seg_dur = seg_end - seg_start
    phones = ctc_decode_positioned(logits)

    if not phones or seg_dur <= 0:
        all_results.append("".join(t for _, t in phones))
        continue

    # Find the longest blank run near each word boundary timestamp
    words = seg.get("words", [])
    break_phone_indices = set()
    search_radius = 4
    for i in range(1, len(words)):
        boundary_time = (words[i-1]["end"] + words[i]["start"]) / 2 - seg_start
        target_frame = int(boundary_time / seg_dur * n_frames)

        # Find the phone index whose frame is nearest this target
        best_pi = None
        best_dist = float("inf")
        for pi, (fi, _) in enumerate(phones):
            if abs(fi - target_frame) < best_dist:
                best_dist = abs(fi - target_frame)
                best_pi = pi

        if best_pi is not None:
            # Look for the best gap (longest blank run) among nearby phone boundaries
            best_gap_pi = best_pi
            best_gap_len = 0
            lo = max(0, best_pi - search_radius)
            hi = min(len(phones) - 1, best_pi + search_radius)
            for pi in range(lo, hi + 1):
                if pi == 0:
                    continue
                gap = phones[pi][0] - phones[pi-1][0]
                if gap > best_gap_len:
                    best_gap_len = gap
                    best_gap_pi = pi
            break_phone_indices.add(best_gap_pi)

    # Build phoneme string with spaces at break points
    parts = []
    for pi, (fi, token) in enumerate(phones):
        if pi in break_phone_indices:
            parts.append(" ")
        parts.append(token)

    all_results.append("".join(parts))

print(json.dumps(all_results))
"""
    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True, text=True,
        env={**__import__("os").environ, "KMP_DUPLICATE_LIB_OK": "TRUE"},
    )
    if result.returncode != 0:
        raise RuntimeError(f"Phoneme recognition failed:\n{result.stderr}")
    for line in result.stdout.strip().split("\n"):
        if line.startswith("["):
            return json.loads(line)
    raise RuntimeError(f"No JSON output:\n{result.stderr}\n{result.stdout}")


def transcribe_aligned(
    audio_path: Path, whisper_size: str = "medium",
    on_status=None,
) -> list[AlignedSegment]:
    if on_status:
        on_status("Running speech-to-text (Whisper)...")
    segments = _run_whisper(audio_path, whisper_size)

    if on_status:
        on_status("Running phoneme recognition...")
    seg_phonemes = _run_phonemes(audio_path, segments)

    results = []
    for seg, phonemes in zip(segments, seg_phonemes):
        words = [WordPhoneme(word=w["word"], phonemes="") for w in seg.get("words", [])]
        results.append(AlignedSegment(
            text=seg["text"],
            phonemes=phonemes,
            words=words,
            start=seg["start"],
            end=seg["end"],
        ))

    return results


def format_aligned(segments: list[AlignedSegment]) -> str:
    lines = []
    for seg in segments:
        lines.append(seg.text)
        lines.append(f"/{seg.phonemes}/")
        lines.append("")
    return "\n".join(lines)
