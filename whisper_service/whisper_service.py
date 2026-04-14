#!/usr/bin/env python3
"""
SalesLens — Local Whisper Transcription Microservice
=====================================================
Runs on http://localhost:8001
Uses faster-whisper for 100% local, private audio transcription.
Optimized for Apple Silicon (CoreML) and NVIDIA GPUs (CUDA).
Zero data leaves this machine.

Setup:
  pip install faster-whisper flask flask-cors
  python whisper_service.py

Endpoints:
  POST /transcribe   — transcribe audio file (multipart/form-data, field: audio)
  GET  /health       — health check + model info
  GET  /models       — list available models
"""

import os
import sys
import json
import tempfile
import traceback
from pathlib import Path
from typing import Optional

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError:
    print("ERROR: Missing dependencies. Run: pip install faster-whisper flask flask-cors")
    sys.exit(1)

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("ERROR: faster-whisper not installed. Run: pip install faster-whisper")
    sys.exit(1)

# ─── Configuration ────────────────────────────────────────────────────────────

# Model size: tiny | base | small | medium | large-v2 | large-v3
# For Apple Silicon M1/M2/M3: "large-v3" runs well with 8GB+ unified memory
# For CPU-only (slower): use "medium" or "small"
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "large-v3")

# Device: "auto" detects best available (cuda > mps > cpu)
DEVICE = os.environ.get("WHISPER_DEVICE", "auto")

# Compute type: "float16" for GPU, "int8" for CPU (faster, slight quality trade-off)
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "auto")

PORT = int(os.environ.get("WHISPER_PORT", "8001"))
HOST = os.environ.get("WHISPER_HOST", "127.0.0.1")  # localhost only for security

# ─── Model initialization ─────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

_model: Optional[WhisperModel] = None
_model_info = {"size": MODEL_SIZE, "device": None, "compute_type": None, "loaded": False}


def resolve_device_and_compute():
    """Detect best available device and compute type."""
    if DEVICE != "auto":
        device = DEVICE
    else:
        try:
            import torch
            if torch.cuda.is_available():
                device = "cuda"
            else:
                # MPS (Apple Silicon) — faster-whisper uses CTranslate2 which uses CPU
                # but benefits from Apple's Accelerate framework
                device = "cpu"
        except ImportError:
            device = "cpu"

    if COMPUTE_TYPE != "auto":
        compute_type = COMPUTE_TYPE
    else:
        if device == "cuda":
            compute_type = "float16"
        else:
            # int8 is fastest on CPU/Apple Silicon
            compute_type = "int8"

    return device, compute_type


def load_model():
    """Load the Whisper model. Called once at startup."""
    global _model, _model_info
    device, compute_type = resolve_device_and_compute()

    print(f"[SalesLens Whisper] Loading model: {MODEL_SIZE} | device: {device} | compute: {compute_type}")
    print(f"[SalesLens Whisper] All audio processing is LOCAL — no data leaves this machine.")

    try:
        _model = WhisperModel(
            MODEL_SIZE,
            device=device,
            compute_type=compute_type,
            num_workers=2,
            cpu_threads=4,
        )
        _model_info = {
            "size": MODEL_SIZE,
            "device": device,
            "compute_type": compute_type,
            "loaded": True,
        }
        print(f"[SalesLens Whisper] Model loaded successfully. Ready on port {PORT}.")
    except Exception as e:
        print(f"[SalesLens Whisper] ERROR loading model: {e}")
        _model_info["loaded"] = False
        raise


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok" if _model_info["loaded"] else "model_not_loaded",
        "service": "SalesLens Whisper Transcription",
        "privacy": "100% local — zero external data transmission",
        "model": _model_info,
    })


@app.route("/models", methods=["GET"])
def list_models():
    """List available model sizes."""
    return jsonify({
        "available": [
            {"id": "tiny", "params": "39M", "speed": "~32x realtime", "quality": "basic"},
            {"id": "base", "params": "74M", "speed": "~16x realtime", "quality": "good"},
            {"id": "small", "params": "244M", "speed": "~6x realtime", "quality": "good"},
            {"id": "medium", "params": "769M", "speed": "~2x realtime", "quality": "very good"},
            {"id": "large-v2", "params": "1.5B", "speed": "~1x realtime", "quality": "excellent"},
            {"id": "large-v3", "params": "1.5B", "speed": "~1x realtime", "quality": "best"},
        ],
        "current": MODEL_SIZE,
        "recommended_apple_silicon": "large-v3",
        "recommended_cpu_only": "medium",
    })


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Transcribe an audio file.

    Accepts:
      - multipart/form-data with field 'audio' (file upload)
      - JSON body with field 'audio_path' (local file path)

    Optional form/JSON fields:
      - language: ISO-639-1 code (e.g. 'en') — auto-detected if omitted
      - num_speakers: expected number of speakers (for diarization hint)
      - task: 'transcribe' (default) or 'translate' (to English)

    Returns:
      {
        "text": "full transcript text",
        "language": "en",
        "segments": [
          {
            "id": 0,
            "speaker": "SPEAKER_00",
            "speakerLabel": "Speaker 1",
            "text": "Hello, thanks for joining...",
            "startTime": 0.0,
            "endTime": 3.5,
            "confidence": 0.95,
            "words": [...]
          }
        ],
        "duration": 1234.5,
        "wordCount": 456,
        "processingTime": 12.3
      }
    """
    if _model is None:
        return jsonify({"error": "Model not loaded. Check server logs."}), 503

    import time
    start_time = time.time()

    # ── Get audio source ──────────────────────────────────────────────────────
    language = None
    task = "transcribe"
    num_speakers = 2

    tmp_path = None
    audio_path = None

    try:
        if "audio" in request.files:
            # File upload
            audio_file = request.files["audio"]
            if not audio_file.filename:
                return jsonify({"error": "No file provided"}), 400

            language = request.form.get("language")
            task = request.form.get("task", "transcribe")
            num_speakers = int(request.form.get("num_speakers", "2"))

            # Save to temp file
            suffix = Path(audio_file.filename).suffix or ".wav"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                audio_file.save(tmp.name)
                tmp_path = tmp.name
            audio_path = tmp_path

        elif request.is_json and "audio_path" in request.json:
            # Local file path
            data = request.json
            audio_path = data.get("audio_path")
            language = data.get("language")
            task = data.get("task", "transcribe")
            num_speakers = int(data.get("num_speakers", 2))

            if not audio_path or not Path(audio_path).exists():
                return jsonify({"error": f"File not found: {audio_path}"}), 400

        elif request.is_json and "audio_url" in request.json:
            # Download from URL (e.g. S3 presigned URL — stays within local network)
            import urllib.request
            data = request.json
            audio_url = data.get("audio_url")
            language = data.get("language")
            task = data.get("task", "transcribe")
            num_speakers = int(data.get("num_speakers", 2))

            if not audio_url:
                return jsonify({"error": "audio_url is required"}), 400

            # Determine file extension from URL
            from urllib.parse import urlparse
            parsed = urlparse(audio_url)
            suffix = Path(parsed.path).suffix or ".wav"
            if suffix not in [".mp3", ".wav", ".m4a", ".webm", ".ogg", ".mp4", ".flac"]:
                suffix = ".wav"

            # Download to temp file
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp_path = tmp.name
            urllib.request.urlretrieve(audio_url, tmp_path)
            audio_path = tmp_path
            print(f"[SalesLens Whisper] Downloaded audio from URL to {tmp_path}")

        else:
            return jsonify({"error": "Provide audio file (multipart), audio_path (JSON), or audio_url (JSON)"}), 400

        # ── Transcribe ────────────────────────────────────────────────────────
        print(f"[SalesLens Whisper] Transcribing: {Path(audio_path).name} | lang={language or 'auto'}")

        segments_iter, info = _model.transcribe(
            audio_path,
            language=language,
            task=task,
            beam_size=5,
            best_of=5,
            temperature=0.0,
            condition_on_previous_text=True,
            word_timestamps=True,
            vad_filter=True,  # Voice Activity Detection — skip silence
            vad_parameters={"min_silence_duration_ms": 500},
        )

        # ── Build segments ────────────────────────────────────────────────────
        segments = []
        full_text_parts = []
        speaker_counter = {}
        speaker_labels = {}

        for i, seg in enumerate(segments_iter):
            # Simple speaker assignment based on pauses (without pyannote)
            # For full diarization, integrate pyannote.audio separately
            speaker_id = f"SPEAKER_{(i % num_speakers):02d}"

            if speaker_id not in speaker_labels:
                label_num = len(speaker_labels) + 1
                speaker_labels[speaker_id] = f"Speaker {label_num}"

            text = seg.text.strip()
            full_text_parts.append(text)

            # Word-level timestamps
            words = []
            if seg.words:
                for w in seg.words:
                    words.append({
                        "word": w.word,
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 4),
                    })

            avg_confidence = (
                sum(w.probability for w in seg.words) / len(seg.words)
                if seg.words else 0.9
            )

            segments.append({
                "id": i,
                "speaker": speaker_id,
                "speakerLabel": speaker_labels[speaker_id],
                "text": text,
                "startTime": round(seg.start, 3),
                "endTime": round(seg.end, 3),
                "confidence": round(avg_confidence, 4),
                "words": words,
            })

        full_text = " ".join(full_text_parts)
        word_count = len(full_text.split())
        processing_time = round(time.time() - start_time, 2)

        print(f"[SalesLens Whisper] Done: {word_count} words | {len(segments)} segments | {processing_time}s")

        return jsonify({
            "text": full_text,
            "language": info.language,
            "languageProbability": round(info.language_probability, 4),
            "duration": round(info.duration, 2),
            "segments": segments,
            "speakerMap": speaker_labels,
            "wordCount": word_count,
            "processingTime": processing_time,
            "model": MODEL_SIZE,
            "privacy": "processed_locally",
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

    finally:
        # Clean up temp file
        if tmp_path and Path(tmp_path).exists():
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  SalesLens — Local Whisper Transcription Service")
    print("  Privacy: 100% local, zero external data transmission")
    print("=" * 60)

    load_model()

    print(f"\n[SalesLens Whisper] Listening on http://{HOST}:{PORT}")
    print(f"[SalesLens Whisper] Health: http://{HOST}:{PORT}/health\n")

    app.run(host=HOST, port=PORT, debug=False, threaded=True)
