from pathlib import Path

import soundfile as sf
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

_processor = None
_model = None

MODEL_ID = "facebook/wav2vec2-lv-60-espeak-cv-ft"


def get_model():
    global _processor, _model
    if _processor is None:
        _processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
        _model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID, use_safetensors=True)
    return _processor, _model


def load_audio(audio_path: Path, target_sr: int = 16000) -> tuple:
    """Load audio file and resample to target sample rate."""
    data, sr = sf.read(str(audio_path), dtype="float32")
    if len(data.shape) > 1:
        data = data.mean(axis=1)
    if sr != target_sr:
        import numpy as np
        duration = len(data) / sr
        num_samples = int(duration * target_sr)
        indices = np.linspace(0, len(data) - 1, num_samples)
        data = np.interp(indices, np.arange(len(data)), data).astype(np.float32)
        sr = target_sr
    return data, sr


def transcribe_phones(audio_path: Path) -> str:
    """Recognize phones directly from audio, returning IPA transcription.

    Uses wav2vec2 fine-tuned on phoneme recognition — captures actual
    pronunciation (accent, dialect) rather than dictionary phonetics.
    """
    processor, model = get_model()
    audio, sr = load_audio(audio_path)

    inputs = processor(audio, sampling_rate=sr, return_tensors="pt", padding=True)

    with torch.no_grad():
        logits = model(**inputs).logits

    predicted_ids = torch.argmax(logits, dim=-1)
    transcription = processor.batch_decode(predicted_ids)[0]
    return transcription


def transcribe_phones_with_timestamps(audio_path: Path) -> list[tuple[float, str]]:
    """Recognize phones with approximate time positions.

    Returns list of (time_seconds, phone) tuples.
    """
    processor, model = get_model()
    audio, sr = load_audio(audio_path)
    duration = len(audio) / sr

    inputs = processor(audio, sampling_rate=sr, return_tensors="pt", padding=True)

    with torch.no_grad():
        logits = model(**inputs).logits

    predicted_ids = torch.argmax(logits, dim=-1)[0]
    num_frames = len(predicted_ids)
    time_per_frame = duration / num_frames

    phones = []
    prev_id = -1
    for i, token_id in enumerate(predicted_ids):
        tid = token_id.item()
        if tid == processor.tokenizer.pad_token_id:
            prev_id = tid
            continue
        if tid == prev_id:
            continue
        token = processor.tokenizer.decode([tid]).strip()
        if token:
            phones.append((i * time_per_frame, token))
        prev_id = tid

    return phones
