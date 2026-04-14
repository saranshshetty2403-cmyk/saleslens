# SalesLens — AI Sales Call Intelligence Tool

## Database & Schema
- [x] meetings table (id, title, platform, meetingUrl, recallBotId, status, scheduledAt, startedAt, endedAt, duration, participants, createdAt, updatedAt)
- [x] transcripts table (id, meetingId, fullText, segments JSON, speakerMap JSON, language, wordCount, createdAt)
- [x] ai_analyses table (id, meetingId, summary, painPoints JSON, objections JSON, buyingSignals JSON, nextSteps JSON, dealScore, sentiment, createdAt)
- [x] spiced_reports table (id, meetingId, situation, pain, impact, criticalEvent, decision, aiGenerated boolean, lastEditedAt, createdAt)
- [x] meddpicc_reports table (id, meetingId, metrics, economicBuyer, decisionCriteria, decisionProcess, paperProcess, identifyPain, champion, competition, aiGenerated boolean, lastEditedAt, createdAt)
- [x] action_items table (id, meetingId, title, description, dueDate, status, priority, assignee, createdAt, updatedAt)
- [x] notes table (id, meetingId, content, isAiGenerated, templateType, createdAt, updatedAt)
- [x] app_settings table (id, ollamaEndpoint, ollamaModel, whisperEndpoint, botName, createdAt, updatedAt)

## Backend Routers
- [x] meetings router: create, list, get, update, delete, updateStatus, stats, search
- [x] transcripts router: get by meetingId, save manual transcript, transcribe from audio URL (via local Whisper)
- [x] analysis router: generateAnalysis (AI summary, pain points, objections, buying signals, deal score) via Ollama
- [x] spiced router: generate (Ollama LLM structured JSON), get, update (manual edits)
- [x] meddpicc router: generate (Ollama LLM structured JSON), get, update (manual edits)
- [x] actionItems router: create, list, update, delete, updateStatus, extractFromTranscript (Ollama)
- [x] notes router: create, get, update (structured template notes)
- [x] settings router: get, update, healthCheck (Ollama + Whisper live status)
- [x] recall router: privacy-first stubs (no external bot — manual recording workflow)

## Frontend Pages
- [x] App.tsx: dark theme, sidebar layout, all routes
- [x] SalesLayout: custom dark sidebar with nav icons, active states, privacy badge
- [x] Dashboard/Home page: stats cards, recent meetings, quick actions, deal score chart
- [x] Meetings list page: searchable, filterable by platform/status
- [x] New Meeting page: form to create meeting with platform/URL fields
- [x] Meeting Detail page: transcript viewer, speaker segments, timestamps
- [x] AI Analysis tab: summary, pain points, objections, buying signals, next steps, key quotes
- [x] SPICED Report tab: editable fields with AI pre-fill, confidence indicators, regenerate
- [x] MEDDPICC Report tab: editable fields with AI pre-fill, confidence indicators, regenerate
- [x] Action Items page: list with due dates, status, priority, filters, inline status update
- [x] Deal Timeline page: visual timeline of meetings per deal/account
- [x] Notes page: structured editable note templates
- [x] Settings page: Ollama/Whisper endpoint config, live health checks, quick setup guide
- [x] Analysis page: all meeting analyses aggregated view
- [x] SpicedReports page: all SPICED reports list view
- [x] MeddpiccReports page: all MEDDPICC reports list view

## UI/UX
- [x] Dark theme CSS variables (slate/zinc palette with blue/indigo accents)
- [x] Sidebar navigation with icons and active states
- [x] Platform badges (Zoom, Meet, Teams, Slack, Webex) with color coding
- [x] Status badges for meetings (scheduled, recording, processing, complete, failed)
- [x] Transcript search with keyword highlighting
- [x] AI confidence indicators on methodology fields
- [x] Editable inline fields for SPICED/MEDDPICC with save/discard
- [x] Action item status tracking (open, in-progress, done)
- [x] Deal score visualization
- [x] Responsive layout

## Local AI Stack — Privacy First (Zero External Data)
- [x] faster-whisper Python microservice (whisper_service.py, port 8001, Apple Silicon optimized)
- [x] Dual input mode: audio file upload (MP3/WAV/M4A/WebM) OR raw transcript paste
- [x] Audio stored only in local DB/S3 — never sent to external APIs
- [x] All cloud LLM calls replaced with Ollama (localhost:11434, llama3.1:8b)
- [x] SPICED report generator via Ollama structured JSON output
- [x] MEDDPICC report generator via Ollama structured JSON output
- [x] AI analysis (summary, pain points, objections, buying signals) via Ollama
- [x] Action items extractor via Ollama
- [x] Settings page: configurable Ollama endpoint + Whisper endpoint
- [x] Settings page: live health check for Ollama + Whisper service status
- [x] Graceful UI fallback when local AI services are offline
- [x] Data privacy badge in sidebar showing 'All data stays local'
- [x] SETUP.md: Ollama install, llama3.1:8b pull, faster-whisper setup, IndiaAI GPU config
- [x] whisper_service.py updated to support audio_url (download from S3) in addition to multipart/audio_path

## Tests
- [x] auth router tests (single-user no-auth mode)
- [x] localAI module tests: Ollama health check, Whisper health check, JSON parsing with fallbacks
- [x] meetings router tests (list, stats, search)
- [x] actionItems router tests
- [x] settings router tests
- [x] SPICED/MEDDPICC field name validation tests
- [x] 18/18 tests passing
