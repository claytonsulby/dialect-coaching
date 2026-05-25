import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class WordPhoneme:
    word: str
    expected: str
    actual: str


@dataclass
class PhoneChange:
    expected: str
    actual: str


@dataclass
class WordAccentMap:
    word: str
    expected: str
    actual: str
    changes: list[PhoneChange] = field(default_factory=list)


@dataclass
class AlignedSegment:
    text: str
    expected_phonemes: str
    actual_phonemes: str
    words: list[WordPhoneme] = field(default_factory=list)
    accent_map: list[WordAccentMap] = field(default_factory=list)
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
    """Full-segment CTC decode from audio. Returns one phoneme string per segment.
    Pure audio signal — no dictionary, no forced alignment."""
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

def ctc_decode(logits_slice):
    pred_ids = torch.argmax(logits_slice, dim=-1).tolist()
    prev = -1
    phones = []
    for pid in pred_ids:
        if pid == 0 or pid == prev:
            prev = pid
            continue
        token = proc.tokenizer.decode([pid]).strip()
        if token:
            phones.append(token)
        prev = pid
    return "".join(phones)

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

    all_results.append(ctc_decode(logits))

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


def _get_expected_phonemes(words: list[str]) -> dict[str, str]:
    """Get standard IPA pronunciation for words using espeak-ng."""
    if not words:
        return {}
    words_json = json.dumps(words)
    script = f"""
import json
from phonemizer import phonemize
words = json.loads({words_json!r})
phs = phonemize(words, language="en-us", backend="espeak", strip=True,
                language_switch="remove-flags")
print(json.dumps(dict(zip(words, phs))))
"""
    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return {w: "" for w in words}
    try:
        return json.loads(result.stdout.strip())
    except (json.JSONDecodeError, ValueError):
        return {w: "" for w in words}


def _nw_align(seq_a: str, seq_b: str) -> list[tuple[str, str]]:
    """Needleman-Wunsch alignment of two strings.
    Returns list of (char_a, char_b) pairs. '∅' marks gaps."""
    m, n = len(seq_a), len(seq_b)
    MATCH, MISMATCH, GAP = 2, -1, -1
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = GAP * i
    for j in range(n + 1):
        dp[0][j] = GAP * j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            score = MATCH if seq_a[i - 1] == seq_b[j - 1] else MISMATCH
            dp[i][j] = max(dp[i - 1][j - 1] + score, dp[i - 1][j] + GAP, dp[i][j - 1] + GAP)

    pairs: list[tuple[str, str]] = []
    i, j = m, n
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            score = MATCH if seq_a[i - 1] == seq_b[j - 1] else MISMATCH
            if dp[i][j] == dp[i - 1][j - 1] + score:
                pairs.append((seq_a[i - 1], seq_b[j - 1]))
                i -= 1
                j -= 1
                continue
        if i > 0 and dp[i][j] == dp[i - 1][j] + GAP:
            pairs.append((seq_a[i - 1], "∅"))
            i -= 1
        else:
            pairs.append(("∅", seq_b[j - 1]))
            j -= 1
    pairs.reverse()
    return pairs


def _align_segment_words(
    word_expected: list[tuple[str, str]],
    actual_raw: str,
) -> tuple[list[WordPhoneme], list[WordAccentMap]]:
    """Align concatenated expected phonemes against actual CTC phonemes.
    Uses alignment to assign actual phones to words (not timestamps)."""
    if not word_expected or not actual_raw:
        return [WordPhoneme(w, e, "") for w, e in word_expected], []

    expected_concat = "".join(e for _, e in word_expected)
    if not expected_concat:
        return [WordPhoneme(w, e, actual_raw if i == 0 else "") for i, (w, e) in enumerate(word_expected)], []

    # Map each character position in expected_concat to its word index
    char_to_wi: list[int] = []
    for wi, (_, exp) in enumerate(word_expected):
        char_to_wi.extend([wi] * len(exp))

    alignment = _nw_align(expected_concat, actual_raw)

    n_words = len(word_expected)
    word_actual_chars: list[list[str]] = [[] for _ in range(n_words)]
    word_changes: list[list[tuple[str, str]]] = [[] for _ in range(n_words)]

    ei = 0
    current_wi = 0
    for exp_ch, act_ch in alignment:
        if exp_ch != "∅":
            current_wi = char_to_wi[ei]
            ei += 1

        if exp_ch != "∅" and act_ch != "∅":
            word_actual_chars[current_wi].append(act_ch)
            if exp_ch != act_ch:
                word_changes[current_wi].append((exp_ch, act_ch))
        elif exp_ch != "∅":
            word_changes[current_wi].append((exp_ch, "∅"))
        else:
            word_actual_chars[current_wi].append(act_ch)
            word_changes[current_wi].append(("∅", act_ch))

    words_result = []
    accent_map = []
    for wi, (word, expected) in enumerate(word_expected):
        actual = "".join(word_actual_chars[wi])
        words_result.append(WordPhoneme(word=word, expected=expected, actual=actual))
        if expected != actual and word_changes[wi]:
            accent_map.append(WordAccentMap(
                word=word, expected=expected, actual=actual,
                changes=[PhoneChange(e, a) for e, a in word_changes[wi]],
            ))

    return words_result, accent_map


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

    all_words = sorted({
        w["word"] for seg in segments for w in seg.get("words", [])
    })
    if on_status:
        on_status(f"Getting standard pronunciations ({len(all_words)} words)...")
    expected_map = _get_expected_phonemes(all_words)

    results = []
    for seg, actual_raw in zip(segments, seg_phonemes):
        seg_words = [w["word"] for w in seg.get("words", [])]
        word_expected = [(w, expected_map.get(w, "")) for w in seg_words]

        words, accent_map = _align_segment_words(word_expected, actual_raw)

        expected_str = " ".join(expected_map.get(w, "") for w in seg_words)

        actual_str = " ".join(w.actual for w in words if w.actual)

        results.append(AlignedSegment(
            text=seg["text"],
            expected_phonemes=expected_str,
            actual_phonemes=actual_str,
            words=words,
            accent_map=accent_map,
            start=seg["start"],
            end=seg["end"],
        ))

    return results


def format_aligned(segments: list[AlignedSegment]) -> str:
    lines = []
    for seg in segments:
        lines.append(seg.text)
        lines.append(f"  Standard: /{seg.expected_phonemes}/")
        lines.append(f"  Heard:    /{seg.actual_phonemes}/")
        if seg.accent_map:
            for m in seg.accent_map:
                changes_str = ", ".join(
                    f"{c.expected}→{c.actual}" for c in m.changes
                )
                lines.append(f"    {m.word}: /{m.expected}/ → /{m.actual}/  [{changes_str}]")
        lines.append("")

    # Aggregate accent summary
    phone_changes: dict[tuple[str, str], int] = {}
    for seg in segments:
        for m in seg.accent_map:
            for c in m.changes:
                key = (c.expected, c.actual)
                phone_changes[key] = phone_changes.get(key, 0) + 1

    if phone_changes:
        lines.append("=" * 40)
        lines.append("ACCENT SUMMARY")
        lines.append("=" * 40)
        for (exp, act), count in sorted(phone_changes.items(), key=lambda x: -x[1]):
            if count >= 2:
                lines.append(f"  /{exp}/ → /{act}/  ({count}×)")
        lines.append("")

    return "\n".join(lines)
