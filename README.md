# SalesLens — AI Sales Intelligence Platform for HackerEarth

SalesLens is a purpose-built, AI-powered sales intelligence web application designed for the HackerEarth sales team. It transforms raw meeting transcripts into structured sales intelligence, automates follow-up workflows, and equips reps with real-time competitive and objection-handling tools — all pre-loaded with HackerEarth product, competitive, and ICP knowledge.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [Modules and Pages](#modules-and-pages)
6. [API Routers](#api-routers)
7. [AI Integration](#ai-integration)
8. [Knowledge Base](#knowledge-base)
9. [Environment Variables](#environment-variables)
10. [Local Development](#local-development)
11. [Seeding Demo Data](#seeding-demo-data)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [File Structure](#file-structure)

---

## Overview

SalesLens solves three core problems for HackerEarth's enterprise sales team:

**Post-call intelligence gap.** Reps spend 30–60 minutes manually writing up call notes, SPICED/MEDDPICC reports, and action items. SalesLens does this automatically in under 30 seconds by running the transcript through a structured LLM pipeline.

**Pre-call preparation.** Reps go into calls cold. SalesLens generates a pre-call intelligence brief for each account: company profile, trigger events, recommended HackerEarth product angle, and a suggested opening line.

**Competitive and objection handling.** Reps face the same objections (pricing, HackerRank comparison, data residency) repeatedly. SalesLens provides a live battlecard and objection library pre-loaded with HackerEarth-specific responses.

---

## Architecture

```
Browser (React 19)
  Vite + Tailwind 4 + shadcn/ui + tRPC client + React Query
        |
        | HTTPS / tRPC over HTTP
        |
Express 4 Server
  tRPC router -> procedures -> DB helpers -> LLM helpers
  Manus OAuth (/api/oauth/callback)
  Static file serving (Vite build in production)
        |                    |
TiDB (MySQL)          Manus LLM API (Whisper + GPT-4o)
Drizzle ORM           invokeLLM() / transcribeAudio()
```

The frontend and backend are served from the same Express process in development (Vite dev server proxied) and production (Vite build served as static files). All API calls go through tRPC procedures — there are no hand-rolled REST routes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + Vite 6 |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix UI) |
| Routing | wouter |
| State / data fetching | tRPC 11 + TanStack React Query |
| Backend | Express 4 + tRPC adapter |
| Database ORM | Drizzle ORM (MySQL/TiDB dialect) |
| Database | TiDB Serverless (MySQL-compatible) |
| Auth | Manus OAuth 2.0 (PKCE) |
| LLM | Manus built-in LLM API (GPT-4o class) |
| Speech-to-text | Manus built-in Whisper API |
| File storage | AWS S3 (via Manus storage helpers) |
| Type safety | TypeScript 5 end-to-end (tRPC infers types) |
| Serialization | superjson (Date objects survive the wire) |
| Testing | Vitest |
| Animations | Framer Motion |
| Charts | Recharts |
| Form handling | React Hook Form + Zod |

---

## Database Schema

The database uses 13 tables. All timestamps are stored as UTC `TIMESTAMP` columns. Column names use camelCase (matching Drizzle's default mapping).

| Table | Purpose |
|---|---|
| `users` | Authenticated users (Manus OAuth). Includes `role` enum (`admin`/`user`). |
| `meetings` | Core meeting records: title, platform, account/contact, deal stage, status, scheduled time. |
| `transcripts` | Full transcript text + word count + optional speaker segments (JSON). One per meeting. |
| `ai_analyses` | General AI analysis output: summary, key moments, next steps, sentiment, deal score. |
| `spiced_reports` | SPICED framework fields: Situation, Pain, Impact, Critical Event, Decision. |
| `meddpicc_reports` | MEDDPICC framework fields: Metrics, Economic Buyer, Decision Criteria, etc. |
| `action_items` | Tasks extracted from meetings. Priority enum: `low/medium/high/urgent`. Status enum: `open/in_progress/completed/cancelled`. |
| `notes` | Free-form markdown notes attached to a meeting. |
| `app_settings` | Single-row settings: Ollama endpoint, Whisper endpoint, bot name. |
| `pitch_coaching` | AI-generated pitch coaching: strengths, weaknesses, talk-time ratio, filler word count. |
| `pre_call_intelligence` | Pre-call brief: company profile, trigger events, prep bullets, suggested opening. |
| `prospects` | Prospect pipeline: company, contact, fit reason, outreach angle, trigger event, status. |
| `generated_emails` | AI-generated emails: follow-up, cold outreach, objection response, proposal follow-up. |

Schema file: `drizzle/schema.ts`

---

## Modules and Pages

### Overview Group

**Dashboard** (`/`)
The command center. Shows live stats (total meetings, completed, scheduled), recent meetings list, open action items, and a prospect pipeline summary. All data is fetched via tRPC queries with loading skeletons.

**Meetings** (`/meetings`)
Full meeting list with search, filter by status and deal stage, and pagination. Each row links to the meeting detail page.

**New Meeting** (`/meetings/new`)
Form to create a new meeting record. Supports all platforms (Zoom, Google Meet, Teams, Slack, Webex). Optional transcript paste for immediate AI analysis.

**Meeting Detail** (`/meetings/:id`)
The richest page in the app. Tabbed interface with:
- Transcript viewer with word count
- AI Analysis (summary, key moments, deal score, sentiment)
- SPICED report with completeness indicator
- MEDDPICC report with completeness indicator
- Action items for this meeting
- Pitch coaching (talk-time ratio, filler words, strengths/weaknesses)
- Pre-call intelligence brief
- Notes editor

### AI Analysis Group

**Analyze Transcript** (`/analyze`)
Paste or load a transcript and run the full AI analysis pipeline: general analysis, SPICED, MEDDPICC, action items, pitch coaching, and pre-call intelligence — all in one click.

**SPICED Reports** (`/spiced`)
List view of all SPICED reports across meetings. Shows completeness percentage and deal stage.

**MEDDPICC Reports** (`/meddpicc`)
List view of all MEDDPICC reports. Completeness bar and key field previews.

**AI Analysis** (`/analysis`)
Aggregated view of all AI analyses. Deal score distribution, sentiment trends, key moments across meetings.

### Sales Tools Group

**Email Generator** (`/email`)
AI-powered email composer. Select email type (follow-up, cold outreach, objection response, demo follow-up, proposal follow-up), provide context, and generate a HackerEarth-branded email. History of all generated emails is saved.

**Prospect Queue** (`/prospects`)
Lead management board. Shows prospects with fit reason, outreach angle, trigger event, and status (`to_contact` → `contacted` → `in_progress` → `converted`). AI can generate new prospects from meeting transcripts.

**Deck Generator** (`/deck`)
Generates a custom sales deck outline for a specific account. Input: company name, deal stage, key pain points, decision maker persona. Output: slide-by-slide outline with HackerEarth product recommendations.

### Intelligence Group

**Battlecards** (`/battlecards`)
Competitive intelligence cards for HackerEarth's main competitors: HackerRank, Mettl, Codility, iMocha, and Karat. Each card shows: strengths vs. weaknesses, win themes, landmines to avoid, and talk tracks.

**Objection Library** (`/objections`)
Searchable library of common sales objections with AI-generated responses. Pre-loaded with 15+ HackerEarth-specific objections (pricing, data residency, question quality, ATS integration, etc.).

### Workflow Group

**Action Items** (`/actions`)
Cross-meeting action item tracker. Filter by status, priority, and meeting. Bulk status updates. Overdue items highlighted in red.

**Deal Timeline** (`/timeline`)
Visual timeline of all meetings per account, showing deal stage progression from Discovery through Demo, Proposal, Negotiation, to Closed.

**Notes** (`/notes`)
Free-form markdown notes across all meetings. Search and filter by meeting.

**Settings** (`/settings`)
App configuration: Ollama endpoint (for local LLM), Whisper endpoint (for local transcription), bot name for the meeting recording bot.

---

## API Routers

All procedures are defined in `server/routers.ts` and exposed under `/api/trpc`. The full tRPC router tree:

| Router | Key Procedures |
|---|---|
| `meetings` | `list`, `get`, `create`, `update`, `delete`, `stats` |
| `transcripts` | `get`, `search`, `save` |
| `analyze` | `run` (full pipeline), `getAll`, `getByMeeting` |
| `spiced` | `get`, `upsert` |
| `meddpicc` | `get`, `upsert` |
| `actionItems` | `list`, `create`, `update`, `delete` |
| `prospects` | `list`, `create`, `update`, `delete`, `generateFromMeeting` |
| `emails` | `generate`, `list`, `delete` |
| `decks` | `generate` |
| `battlecards` | `list` |
| `objections` | `list`, `search` |
| `notes` | `get`, `upsert` |
| `settings` | `get`, `update`, `testConnections` |
| `auth` | `me`, `logout` |
| `system` | `notifyOwner` |

---

## AI Integration

SalesLens uses the Manus built-in LLM API (`invokeLLM`) for all AI features. The API key is injected automatically via the platform — no manual setup required.

### Analysis Pipeline (`analyze.run`)

When a user triggers analysis on a meeting transcript, the following LLM calls run in parallel:

1. **General Analysis** — Summary (3–5 sentences), key moments (timestamped quotes), next steps, sentiment score (1–10), deal score (1–10), talk-time ratio estimate.
2. **SPICED Report** — Structured extraction of Situation, Pain, Impact, Critical Event, Decision fields with evidence quotes.
3. **MEDDPICC Report** — Structured extraction of all 7 MEDDPICC fields with confidence scores.
4. **Action Items** — Extracts 3–7 concrete action items with owner, priority, and due date.
5. **Pitch Coaching** — Evaluates rep performance: strengths, areas for improvement, filler word count, talk-time ratio, recommended next steps.
6. **Pre-Call Intelligence** — Generates a pre-call brief for the account: company profile, trigger events, prep bullets, suggested opening line, recommended HackerEarth product to lead with.

All LLM calls use `response_format: json_schema` for structured output — no regex parsing.

### Email Generation (`emails.generate`)

Generates a complete email (subject + body) given:
- Email type (follow-up, cold outreach, objection response, etc.)
- Recipient name, title, company
- User-provided context
- Optional: meeting transcript for grounding

The system prompt includes HackerEarth's email style guide and value propositions.

### Deck Generation (`decks.generate`)

Generates a 10–12 slide deck outline with:
- Slide title, key message, talking points
- Recommended HackerEarth product for each slide
- Tailored to the account's industry, company size, and deal stage

### Prospect Generation (`prospects.generateFromMeeting`)

Analyzes a completed meeting transcript to identify 3–5 new prospect companies that would be a good fit for HackerEarth, based on companies mentioned in the conversation, industry and company size signals, and trigger events referenced.

---

## Knowledge Base

The file `server/hackerearth-kb.ts` is the single source of truth for all HackerEarth product, market, and competitive knowledge embedded into AI prompts. It exports:

| Export | Contents |
|---|---|
| `HACKEREARTH_COMPANY` | Company overview, founding, customer base |
| `HACKEREARTH_PRODUCTS` | Full product suite: Assessments, AI Screener, Hiring Challenges, FaceCode, Hackathons |
| `HACKEREARTH_ICP` | Ideal Customer Profile: company size, industry, hiring volume, pain points |
| `HACKEREARTH_COMPETITORS` | Competitive intelligence for HackerRank, Mettl, Codility, iMocha, Karat |
| `HACKEREARTH_OBJECTIONS` | 15+ common objections with structured responses |
| `HACKEREARTH_VALUE_PROPS` | Core value propositions and differentiators |
| `HACKEREARTH_SYSTEM_PROMPT` | Master system prompt used across all AI calls |
| `EMAIL_STYLE_PROMPT` | Email tone and style guidelines |

To update any product information, competitive data, or objection responses, edit this file. All AI features will automatically use the updated content.

---

## Environment Variables

The following environment variables are required. They are injected automatically by the Manus platform:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL (frontend) |
| `BUILT_IN_FORGE_API_URL` | Manus built-in APIs base URL |
| `BUILT_IN_FORGE_API_KEY` | Bearer token for server-side Manus API calls |
| `VITE_FRONTEND_FORGE_API_KEY` | Bearer token for client-side Manus API calls |
| `VITE_FRONTEND_FORGE_API_URL` | Manus built-in APIs URL for frontend |
| `OWNER_OPEN_ID` | Owner's Manus Open ID |
| `OWNER_NAME` | Owner's display name |

---

## Local Development

### Prerequisites

- Node.js 22+
- pnpm 9+
- A MySQL-compatible database (TiDB Serverless recommended)

### Setup

```bash
# Clone the repository
git clone https://github.com/saranshshetty2403-cmyk/saleslens.git
cd saleslens

# Install dependencies
pnpm install

# Set environment variables
# Create a .env file with DATABASE_URL and other secrets listed above

# Run database migrations
pnpm drizzle-kit generate
# Then apply the generated SQL via your database client

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server (Vite + Express) |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm test` | Run Vitest test suite |
| `pnpm drizzle-kit generate` | Generate migration SQL from schema changes |
| `node server/do_seed.cjs` | Seed demo data (requires DATABASE_URL) |

---

## Seeding Demo Data

The repository includes a seed script with realistic HackerEarth sales demo data:

- **5 meetings** across the full sales cycle: Discovery (Accenture), Demo (Infosys BPM), Proposal (Wipro), Negotiation (TCS), Closed Won (Cognizant)
- **5 transcripts** — realistic sales conversation transcripts for each meeting
- **10 action items** — extracted from each meeting with appropriate priorities
- **3 prospects** — Deloitte India, HCL Technologies, Tech Mahindra

```bash
node server/do_seed.cjs
```

Note: The seed script uses CommonJS (`require`) and must be run with the `.cjs` extension. The project root uses ES modules (`"type": "module"`).

---

## Testing

Tests are located in `server/saleslens.test.ts` and `server/auth.logout.test.ts`.

```bash
pnpm test
```

The test suite covers:
- tRPC procedure contracts (meetings, analyze, action items, settings, prospects, emails)
- Authentication (logout mutation)
- LLM response parsing (structured JSON schema validation)
- Router behavior with and without database connectivity

All 18 tests pass with 0 TypeScript errors.

---

## Deployment

SalesLens is deployed on the Manus platform. To publish:

1. Save a checkpoint from the Management UI
2. Click the **Publish** button in the Management UI header

The platform handles Node.js server hosting, TiDB Serverless database provisioning, environment variable injection, SSL termination, and custom domain binding (via Settings → Domains).

For self-hosted deployment, the app requires:
- A Node.js 22 server
- A MySQL 8.0+ or TiDB-compatible database
- Environment variables set as described above
- `pnpm build && pnpm start` to serve the production build

---

## File Structure

```
sales-notetaker/
├── client/
│   ├── index.html                    # Vite entry point
│   └── src/
│       ├── App.tsx                   # Route definitions (wouter)
│       ├── main.tsx                  # React root + providers
│       ├── index.css                 # Global styles + Tailwind theme
│       ├── components/
│       │   ├── SalesLayout.tsx       # Sidebar navigation layout
│       │   ├── AIChatBox.tsx         # Reusable chat interface
│       │   └── ui/                   # shadcn/ui components
│       ├── contexts/
│       │   └── AuthContext.tsx       # useAuth() hook
│       ├── hooks/                    # Custom React hooks
│       ├── lib/
│       │   └── trpc.ts               # tRPC client binding
│       └── pages/
│           ├── Dashboard.tsx         # / — Command center
│           ├── Meetings.tsx          # /meetings — Meeting list
│           ├── NewMeeting.tsx        # /meetings/new — Create meeting
│           ├── MeetingDetail.tsx     # /meetings/:id — Full detail
│           ├── Analyze.tsx           # /analyze — Run AI analysis
│           ├── Analysis.tsx          # /analysis — Analysis list
│           ├── SpicedReports.tsx     # /spiced — SPICED list
│           ├── MeddpiccReports.tsx   # /meddpicc — MEDDPICC list
│           ├── EmailGenerator.tsx    # /email — Email composer
│           ├── ProspectQueue.tsx     # /prospects — Lead pipeline
│           ├── DeckGenerator.tsx     # /deck — Deck outline generator
│           ├── Battlecards.tsx       # /battlecards — Competitive intel
│           ├── ObjectionLibrary.tsx  # /objections — Objection responses
│           ├── ActionItems.tsx       # /actions — Task tracker
│           ├── DealTimeline.tsx      # /timeline — Deal progression
│           ├── Notes.tsx             # /notes — Meeting notes
│           └── Settings.tsx          # /settings — App configuration
├── drizzle/
│   └── schema.ts                     # All 13 database tables
├── server/
│   ├── routers.ts                    # All tRPC procedures
│   ├── db.ts                         # Drizzle query helpers
│   ├── hackerearth-kb.ts             # HackerEarth knowledge base
│   ├── localAI.ts                    # Local AI helpers (Ollama/Whisper)
│   ├── storage.ts                    # S3 file storage helpers
│   ├── do_seed.cjs                   # Demo data seed script
│   ├── saleslens.test.ts             # Main test suite (17 tests)
│   └── auth.logout.test.ts           # Auth test (1 test)
├── shared/                           # Shared constants and types
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Credits

Built for the HackerEarth sales team. All HackerEarth product information, competitive intelligence, and ICP data in `server/hackerearth-kb.ts` should be reviewed and updated by the HackerEarth sales enablement team before production use.
