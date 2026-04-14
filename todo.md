# SalesLens — HackerEarth AI Sales Intelligence Platform
# Complete Feature Tracker

## Phase 1: Backend — All Routers & AI Prompts
- [ ] Unified analyze endpoint: transcript in → SPICED, MEDDPICC, summary, action items, pitch coaching, pre-call intel, prospects all generated in one call
- [ ] SPICED router: generate + save + update (editable fields)
- [ ] MEDDPICC router: generate + save + update (editable fields)
- [ ] AI Analysis router: summary, pain points, objections, buying signals, deal score, talk ratio
- [ ] Pitch Coaching router: moment-by-moment feedback, scores, rewrites — HackerEarth-specific
- [ ] Pre-Call Intelligence router: company identification, trigger events, prep bullets, suggested opening
- [ ] Prospects router: CRUD + AI generation from transcript (competitors, buyer personas)
- [ ] Email Generator router: follow-up, cold outreach, objection response — custom style prompt baked in
- [ ] Deck Generator router: extract promises + client asks from transcript, generate slide outline, produce PPTX
- [ ] Battlecards router: static HackerEarth vs HackerRank/Codility/TestGorilla/CodeSignal data
- [ ] Objection Library router: HackerEarth-specific objections with proven responses
- [ ] Action Items router: CRUD + AI extraction from transcript
- [ ] Settings router: Ollama/Whisper endpoint config + health check
- [ ] HackerEarth knowledge base embedded in all AI system prompts

## Phase 2: Test Data — 5 Realistic HackerEarth Sales Scenarios
- [ ] Scenario 1: Discovery call — Razorpay (fintech, 500 engineers, hiring at scale, using HackerRank)
- [ ] Scenario 2: Demo call — Swiggy (food-tech, Series H, needs AI screening for 200 roles/month)
- [ ] Scenario 3: Objection handling — Freshworks (SaaS, budget objection, competitor comparison)
- [ ] Scenario 4: Negotiation/closing — Meesho (e-commerce, procurement process, paper process)
- [ ] Scenario 5: Lost deal analysis — BYJU's (edtech, went with Codility, post-mortem analysis)
- [ ] Full transcripts (1000+ words each) with realistic speaker labels
- [ ] Pre-seeded SPICED, MEDDPICC, analysis, pitch coaching, action items for each scenario
- [ ] Pre-seeded prospects generated from each scenario
- [ ] Pre-seeded emails for each scenario
- [ ] Pre-seeded deck outlines for each scenario

## Phase 3: Frontend — All Pages
- [ ] Analyze page (HERO): transcript paste + audio upload, one-click generate all, progress indicator
- [ ] Analyze results page: tabbed view of all generated reports for a meeting
- [ ] SPICED report page: editable fields, confidence indicators, completeness score, export
- [ ] MEDDPICC report page: editable fields, confidence indicators, completeness score, export
- [ ] Pitch Coach page: overall score, moment cards with what-was-said vs what-should-have-been-said, strengths/improvements
- [ ] Pre-Call Intelligence page: company card, trigger events, prep bullets, suggested opening
- [ ] Prospect Queue page: kanban-style cards, status pipeline, outreach angle, suggested product
- [ ] Email Generator page: email type selector, context input, generated email with copy/edit
- [ ] Deck Generator page: extract promises/asks, slide outline editor, PPTX download
- [ ] Battlecards page: HE vs competitors, feature comparison tables, objection responses
- [ ] Objection Library page: searchable objections with proven responses and context
- [ ] Action Items page: full CRUD, due dates, status, priority, filter by meeting
- [ ] Meeting History page: searchable list, transcript viewer, all reports linked
- [ ] Deal Timeline page: visual progression of deals across meetings
- [ ] Settings page: Ollama/Whisper config, health checks, model selector
- [ ] Dashboard: command center with stats, deal health, recent activity, quick actions

## Phase 4: Dashboard Rebuild
- [ ] Hero stats: meetings analyzed, deals in pipeline, avg deal score, action items due
- [ ] Recent activity feed: last 5 analyses with deal scores
- [ ] Deal health chart: score trend over time (recharts)
- [ ] Quick actions: Analyze New Transcript, Generate Email, Add Prospect
- [ ] Top objections summary widget
- [ ] Competitor mentions tracker widget

## Phase 5: QA & Visual Polish
- [ ] Test Analyze flow end-to-end with each of 5 test scenarios
- [ ] Test SPICED/MEDDPICC edit and save
- [ ] Test Pitch Coach moment cards render correctly
- [ ] Test Email Generator with all 6 email types
- [ ] Test Deck Generator PPTX download
- [ ] Test Prospect Queue status pipeline updates
- [ ] Test Battlecards all 4 competitors
- [ ] Test Objection Library search
- [ ] Test Action Items CRUD
- [ ] Test mobile layout on all pages
- [ ] Fix all visual inconsistencies
- [ ] Verify dark theme consistency across all pages
- [ ] Verify all loading states and error states

## Phase 6: Tests & Delivery
- [ ] Vitest: analyze router unit tests
- [ ] Vitest: SPICED/MEDDPICC generation tests
- [ ] Vitest: email generation tests
- [ ] Vitest: deck generation tests
- [ ] Vitest: prospect CRUD tests
- [ ] Update SETUP.md with complete local AI setup guide
- [ ] Save checkpoint
