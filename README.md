# dialect-coaching

Accent-aware phonetic transcription from audio. Produces IPA output based on how speech **actually sounds** — not dictionary pronunciation.

"car keys" in British English → `k ɑː k iː` (non-rhotic, no R)  
"car keys" in American English → `k ɑː r k iː` (rhotic, with R)

Uses Facebook's wav2vec2 model fine-tuned for phoneme recognition directly from audio waveforms.

## Requirements

- Python 3.11–3.12
- espeak-ng (for the phonemizer tokenizer backend)

```bash
brew install espeak-ng  # macOS
# apt install espeak-ng  # Linux
```

## Install

```bash
uv venv --python 3.11
uv pip install -e "."
```

## Usage

```bash
# Basic transcription
dialect-coaching recording.wav

# With timestamps
dialect-coaching recording.wav --timestamps

# Save output
dialect-coaching recording.wav -o transcript.txt
```

## How it works

The app uses `facebook/wav2vec2-lv-60-espeak-cv-ft`, a wav2vec2 model fine-tuned on phoneme recognition. Unlike text-to-IPA tools (which look up dictionary pronunciations), this model listens to the actual audio waveform and outputs the phones it detects — capturing accent, dialect, and speaker-specific pronunciation.
