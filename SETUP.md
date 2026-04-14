# SalesLens — Local AI Setup Guide

> **Privacy guarantee:** All audio, transcripts, and AI analysis stay entirely on your machine.
> Zero data is sent to any external server. This guide sets up a fully air-gapped AI pipeline.

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Machine** | Apple Silicon (M1/M2/M3/M4) | M2 Pro / M3 Max |
| **RAM** | 8 GB unified memory | 16–32 GB |
| **Storage** | 10 GB free | 20 GB free |
| **OS** | macOS 13 Ventura | macOS 14 Sonoma or later |
| **Python** | 3.9+ | 3.11+ |
| **Node.js** | 18+ | 22+ |

---

## Step 1 — Install Ollama (Local LLM Runtime)

Ollama is a free, open-source runtime that runs large language models entirely on your Mac.

```bash
# Install via Homebrew (recommended)
brew install ollama

# Or download directly from https://ollama.com/download
```

Start the Ollama service:

```bash
ollama serve
```

Pull the recommended model for SalesLens (Llama 3.1 8B — optimised for Apple Silicon):

```bash
ollama pull llama3.1:8b
```

> **Model size:** ~4.7 GB download. Takes 2–5 minutes on a typical connection.
> **Inference speed:** ~30–60 tokens/second on M2 Pro with 16 GB RAM.

Optional — pull a larger model for higher-quality reports (requires 16 GB+ RAM):

```bash
# Higher quality SPICED/MEDDPICC extraction
ollama pull llama3.1:70b-instruct-q4_K_M
```

Verify Ollama is running:

```bash
curl http://localhost:11434/api/tags
# Should return a JSON list of your installed models
```

---

## Step 2 — Set Up the Whisper Transcription Service

The Whisper service transcribes audio files locally using `faster-whisper` — a highly optimised
reimplementation of OpenAI Whisper that runs on CPU with Apple's Accelerate framework.

### Install Python dependencies

```bash
cd whisper_service
pip install faster-whisper flask flask-cors
```

> If you use `conda` or `pyenv`, activate your environment first.

### Start the Whisper service

```bash
# From the whisper_service directory
python whisper_service.py
```

The service starts on `http://localhost:8001`.

**Default model:** `large-v3` (best quality, ~1.5 GB, ~1x realtime on M2)

To use a smaller/faster model:

```bash
WHISPER_MODEL=medium python whisper_service.py   # Faster, slightly lower quality
WHISPER_MODEL=small  python whisper_service.py   # Very fast, good for short calls
```

Verify the service is running:

```bash
curl http://localhost:8001/health
# Returns: {"status": "ok", "model": {...}, "privacy": "100% local — zero external data transmission"}
```

---

## Step 3 — Start SalesLens

```bash
# From the project root
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 4 — Configure in the App

1. Navigate to **Settings** in the sidebar
2. Verify the **Ollama** and **Whisper** health indicators show green
3. Select your preferred Ollama model (default: `llama3.1:8b`)
4. You're ready to go

---

## Using SalesLens

### Recording a Sales Call

SalesLens does not join calls automatically — this keeps your data fully private.
Record your calls using any of these methods:

| Platform | How to Record |
|----------|---------------|
| **Zoom** | Settings → Recording → Local Recording. Press Record during call. |
| **Google Meet** | Activities → Recording (saves to Google Drive — download the MP4) |
| **Microsoft Teams** | More → Record and Transcribe (saves to OneDrive — download the MP4) |
| **Slack Huddles** | Not natively supported — use QuickTime screen recording |
| **Any platform** | QuickTime Player → File → New Audio Recording |

Supported formats: **MP3, WAV, M4A, WebM, MP4, OGG, FLAC** (up to 500 MB)

### Workflow

1. **Create a meeting** in SalesLens (New Meeting → fill in prospect details)
2. **Upload audio** or **paste transcript** in the meeting's Transcript tab
3. Click **"Analyze All"** to generate:
   - Executive summary with sentiment and deal score
   - Pain points, objections, buying signals, next steps
   - **SPICED report** (Situation, Pain, Impact, Critical Event, Decision)
   - **MEDDPICC report** (Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Identify Pain, Champion, Competition)
   - Action items with due dates
4. Edit any AI-generated field manually — all fields are editable
5. Track action items in the **Action Items** dashboard
6. View deal progression in the **Deal Timeline**

---

## Running on IndiaAI GPU Instance

If you have access to an [IndiaAI Compute](https://indiaai.gov.in) GPU instance (NVIDIA H100):

### On the GPU instance

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama serve --host 0.0.0.0  # Listen on all interfaces

# Pull a larger model (H100 can run 70B easily)
ollama pull llama3.1:70b-instruct-q4_K_M

# Install Whisper service
pip install faster-whisper flask flask-cors
WHISPER_DEVICE=cuda WHISPER_MODEL=large-v3 python whisper_service.py --host 0.0.0.0
```

### In SalesLens Settings

Update the endpoints to point to your GPU instance:

- **Ollama Endpoint:** `http://<your-indiaai-instance-ip>:11434`
- **Whisper Endpoint:** `http://<your-indiaai-instance-ip>:8001`

> **Security note:** Use a VPN or SSH tunnel to connect to your IndiaAI instance.
> Do not expose these ports publicly without authentication.

SSH tunnel example:

```bash
ssh -L 11434:localhost:11434 -L 8001:localhost:8001 user@<indiaai-instance-ip>
```

Then keep the endpoints as `localhost` in Settings — traffic is tunnelled securely.

---

## Troubleshooting

### Ollama not responding

```bash
# Check if Ollama is running
ps aux | grep ollama

# Restart Ollama
pkill ollama
ollama serve
```

### Whisper service fails to start

```bash
# Check Python version
python3 --version  # Must be 3.9+

# Reinstall dependencies
pip install --upgrade faster-whisper flask flask-cors

# Check for port conflicts
lsof -i :8001
```

### Transcription is slow

- Switch to a smaller model: `WHISPER_MODEL=medium python whisper_service.py`
- For M1 with 8 GB RAM, use `WHISPER_MODEL=small` for near-realtime speed

### LLM responses are poor quality

- Try a larger model: `ollama pull llama3.1:70b-instruct-q4_K_M`
- Ensure the transcript is clean and contains enough context
- Use the "Regenerate" button to retry with a different random seed

---

## Privacy Architecture

```
Your Mac / IndiaAI GPU Instance
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Browser (localhost:3000)                               │
│       │                                                 │
│       ▼                                                 │
│  SalesLens Node.js Server (localhost:3000/api)          │
│       │                    │                            │
│       ▼                    ▼                            │
│  Ollama LLM            Whisper Service                  │
│  (localhost:11434)     (localhost:8001)                 │
│       │                    │                            │
│       ▼                    ▼                            │
│  llama3.1:8b           faster-whisper                   │
│  (local weights)       (local weights)                  │
│                                                         │
│  MySQL Database (local TiDB / managed)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ▲
         │  Zero data crosses this boundary
         │
    Internet (not used for AI processing)
```

All AI inference, transcription, and data storage happens within the boundary above.
Client names, deal details, and conversation content never leave your infrastructure.

---

## Support

- **GitHub Issues:** Open an issue in the project repository
- **IndiaAI Compute:** [indiaai.gov.in](https://indiaai.gov.in)
- **Ollama Docs:** [ollama.com/docs](https://ollama.com)
- **faster-whisper:** [github.com/SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)
