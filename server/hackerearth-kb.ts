/**
 * HackerEarth Sales Intelligence Knowledge Base
 * This file is the single source of truth for all HackerEarth product, market,
 * and competitive knowledge embedded into AI prompts throughout SalesLens.
 */

export const HACKEREARTH_COMPANY = `
HackerEarth is a B2B SaaS company headquartered in San Francisco (with major operations in Bangalore, India)
that provides technical talent assessment and developer engagement solutions to enterprises globally.
Founded in 2012, HackerEarth serves 4,000+ companies including Amazon, Microsoft, IBM, Walmart, Deloitte,
Goldman Sachs, and hundreds of high-growth startups.
`;

export const HACKEREARTH_PRODUCTS = `
## HackerEarth Product Suite

### 1. HackerEarth Assessments (Core Product)
- AI-powered technical screening platform with 50,000+ coding questions across 50+ programming languages
- Supports MCQ, coding challenges, full-stack projects, data science notebooks, and SQL assessments
- Anti-cheating: AI proctoring, plagiarism detection, browser lockdown, webcam monitoring, IP tracking
- Auto-evaluation with detailed candidate scorecards
- Custom question creation and question bank management
- Integrates with 40+ ATS: Greenhouse, Lever, Workday, SAP SuccessFactors, iCIMS, SmartRecruiters
- Pricing: typically $3,000–$25,000/year depending on volume and features

### 2. HackerEarth AI Screener (Newest Product — High Priority)
- AI conducts the first-round technical interview autonomously (no human interviewer needed)
- Asks adaptive follow-up questions based on candidate responses
- Generates detailed interview report with skill assessment and hiring recommendation
- Saves 15–20 hours of engineering time per hire
- Ideal for companies hiring 50+ technical roles per year
- Addresses "interview fatigue" — engineers spending 30–40% of time on interviews

### 3. HackerEarth Hiring Challenges (Developer Sourcing)
- Branded coding competitions to attract and source passive developer talent
- Companies like Google, Microsoft, Flipkart use these to build talent pipelines
- Generates employer brand awareness in the developer community
- Typical use case: "We need 200 ML engineers in 6 months — let's run a challenge"
- Pricing: $5,000–$50,000 per challenge depending on scale

### 4. HackerEarth FaceCode (Technical Interview Platform)
- Real-time collaborative coding environment for live technical interviews
- Supports pair programming, whiteboarding, and multi-language execution
- Replaces CoderPad, Karat, and similar tools
- Integrates with video conferencing (Zoom, Teams, Meet)

### 5. HackerEarth for Good (Hackathons)
- Internal innovation hackathons for enterprises
- Used by companies like Bosch, Capgemini, Infosys for internal developer engagement
- Separate from hiring — focused on innovation and upskilling
`;

export const HACKEREARTH_ICP = `
## Ideal Customer Profile (ICP) for HackerEarth

### Primary ICP: High-Growth Tech Companies
- **Size**: 200–10,000 employees
- **Hiring volume**: 50–500 technical roles per year
- **Industry**: SaaS, Fintech, E-commerce, Edtech, Gaming, Healthtech
- **Geography**: India, Southeast Asia, Middle East, North America, Europe
- **Tech stack signals**: Engineering-heavy org (>20% of headcount is engineers)
- **Pain signals**: High time-to-hire (>45 days), high interview-to-offer ratio (>8:1), engineer burnout from interviews

### Secondary ICP: Large Enterprises & IT Services
- **Size**: 10,000+ employees
- **Use case**: Campus hiring, bulk technical screening, hackathons
- **Examples**: TCS, Infosys, Wipro, Accenture, Deloitte, Big 4 consulting

### Buyer Personas
1. **Head of Talent Acquisition / VP of HR** — Primary economic buyer. Cares about: time-to-hire, cost-per-hire, quality-of-hire, candidate experience
2. **Engineering Manager / VP Engineering** — Technical champion. Cares about: assessment quality, anti-cheating, reducing interview load on their team
3. **CHRO / CPO** — Executive sponsor for large deals. Cares about: ROI, compliance, employer brand
4. **Talent Operations / TA Ops** — Day-to-day user. Cares about: ATS integration, ease of use, reporting

### Trigger Events (When to Reach Out)
- Company just raised a funding round (Series A+) → hiring surge incoming
- Company announced expansion to new city/country → new talent market
- Company posted 50+ engineering jobs on LinkedIn in last 30 days
- Company recently had a high-profile bad hire or mis-hire scandal
- Company is using HackerRank/Codility and contract is up for renewal
- Company just went public → compliance and process standardization pressure
- Company announced a hackathon or innovation initiative
`;

export const HACKEREARTH_COMPETITORS = {
  hackerrank: {
    name: "HackerRank",
    positioning: "The legacy market leader, strong brand recognition among developers",
    weaknesses: [
      "Expensive — typically 30–40% more than HackerEarth for equivalent features",
      "Limited AI capabilities — no AI Screener equivalent",
      "Question bank is largely public — candidates can find answers on GitHub",
      "Poor customer support — long response times, high churn",
      "No built-in hackathon/hiring challenge product",
      "Rigid pricing — no flexibility for startups or SMBs",
      "ATS integrations are limited compared to HackerEarth's 40+",
    ],
    winStrategy: "Lead with AI Screener (HackerRank has no equivalent), question bank freshness (private questions), and total cost of ownership. Ask: 'How much are your engineers spending on first-round interviews?'",
    battlecard: "HackerEarth vs HackerRank: We have AI Screener (they don't), fresher question bank, better pricing, and 40+ ATS integrations vs their 15. Our anti-cheating is more advanced with behavioral analysis.",
  },
  codility: {
    name: "Codility",
    positioning: "European-origin, strong in EMEA, known for algorithmic challenges",
    weaknesses: [
      "Very limited question types — almost exclusively algorithmic/competitive programming",
      "No support for full-stack, data science, or system design assessments",
      "No AI Screener or automated interview capability",
      "Poor support for Indian market and Indian engineering roles",
      "No hackathon/sourcing product",
      "Expensive for the limited feature set",
      "UI is dated and candidate experience is poor",
    ],
    winStrategy: "Expose the narrow question type coverage. Ask: 'What percentage of your roles require full-stack or data science skills?' Then show HackerEarth's breadth. Also highlight India-specific support.",
    battlecard: "HackerEarth vs Codility: We support 50+ languages and full-stack/DS/SQL assessments. Codility is algorithmic-only. We have AI Screener, they don't. Better for Indian market.",
  },
  testgorilla: {
    name: "TestGorilla",
    positioning: "Skills-based hiring platform, strong in non-technical roles, growing into tech",
    weaknesses: [
      "Not purpose-built for technical/engineering hiring",
      "Question quality for coding assessments is significantly lower",
      "No real-time coding environment (FaceCode equivalent)",
      "No AI Screener",
      "No hackathon/sourcing capability",
      "Limited anti-cheating for coding (easy to cheat)",
      "Better for soft skills/cognitive assessments than technical screening",
    ],
    winStrategy: "Position HackerEarth as the specialist vs generalist. 'TestGorilla is great for non-technical roles, but for engineering hiring, you need a platform built by engineers for engineers.'",
    battlecard: "HackerEarth vs TestGorilla: We're purpose-built for technical hiring. TestGorilla is a generalist platform. Our coding assessments, anti-cheating, and AI Screener are in a different league.",
  },
  codesignal: {
    name: "CodeSignal",
    positioning: "Strong in US market, known for GCA (General Coding Assessment) standardization",
    weaknesses: [
      "Very expensive — enterprise-only pricing, out of reach for most Indian companies",
      "GCA is a standardized test — not customizable for company-specific needs",
      "No hackathon/sourcing product",
      "Limited ATS integrations",
      "No AI Screener",
      "US-centric — poor support for India, SEA markets",
      "Requires candidates to have a CodeSignal profile — friction in the process",
    ],
    winStrategy: "Price and customization. 'CodeSignal's GCA is a one-size-fits-all approach. With HackerEarth, you can customize every assessment to your exact tech stack and role requirements.'",
    battlecard: "HackerEarth vs CodeSignal: We're 50–60% more affordable, fully customizable, and have AI Screener. CodeSignal's GCA is rigid and US-focused. We have better India/SEA coverage.",
  },
};

export const HACKEREARTH_OBJECTIONS = [
  {
    objection: "We already use HackerRank and our team is happy with it",
    category: "incumbent",
    response: "That's great — HackerRank is a solid tool. The question is whether it's keeping pace with your hiring needs. Two things I'd ask: First, how much time are your engineers spending on first-round interviews? HackerEarth's AI Screener eliminates that entirely — HackerRank has no equivalent. Second, when was the last time you reviewed whether candidates are finding answers to your HackerRank questions on GitHub? Our question bank is private and rotated regularly. Happy to do a side-by-side comparison on those two dimensions?",
    hackerEarthAdvantage: "AI Screener, fresher private question bank",
  },
  {
    objection: "It's too expensive / we don't have budget",
    category: "budget",
    response: "I hear you — let me reframe the cost. What's your current time-to-hire for engineering roles? If it's over 45 days, you're losing candidates to competitors. And how many hours per week are your engineers spending on interviews? At 10 hours/week per engineer, that's $50,000+ in lost productivity per year for a team of 5. HackerEarth typically pays for itself in under 3 months. Can we look at the ROI together?",
    hackerEarthAdvantage: "ROI calculator, time-to-hire reduction, engineering time savings",
  },
  {
    objection: "We do all our interviews in-house, we don't need a tool",
    category: "status_quo",
    response: "That's a strong hiring culture — and it works well when you're hiring 5–10 engineers a year. But at your growth rate, you're heading toward 50–100 roles. At that point, the in-house model breaks down — engineers burn out, quality becomes inconsistent, and top candidates drop off because the process takes too long. HackerEarth isn't replacing your interviews — it's handling the 80% of candidates who shouldn't make it to your engineers in the first place.",
    hackerEarthAdvantage: "Scalability, consistency, engineer time protection",
  },
  {
    objection: "We're concerned about candidate experience / it feels impersonal",
    category: "candidate_experience",
    response: "This is actually one of our strongest differentiators. HackerEarth's candidate NPS is 72 — higher than most in-house interview processes. Candidates prefer async assessments because they can take them on their schedule, not yours. And our AI Screener is designed to feel like a conversation, not an interrogation. We can show you candidate feedback data from companies in your industry.",
    hackerEarthAdvantage: "Candidate NPS 72, async flexibility, AI Screener conversational design",
  },
  {
    objection: "We need to check with our engineering team / get their buy-in",
    category: "champion",
    response: "Absolutely — engineering buy-in is critical for this to work. The best way I've seen this done is a 2-week pilot where your engineering team creates 3 questions in our platform and we run 10 real candidates through it. They see the quality of the scorecards, the anti-cheating reports, and the time saved. After that, the conversation changes from 'do we need this' to 'how do we roll this out.' Can we set up a 30-minute session with your VP Engineering?",
    hackerEarthAdvantage: "Pilot program, engineering-led evaluation, scorecard quality",
  },
  {
    objection: "We tried a similar tool before and it didn't work",
    category: "past_failure",
    response: "That's really important context — what happened? [Listen carefully]. In most cases I hear this, it comes down to one of three things: the question quality wasn't relevant to the actual role, the team didn't have time to set it up properly, or the ATS integration was broken. All three are things we specifically designed HackerEarth to solve. Would you be open to sharing what tool it was and what specifically failed? I want to make sure we're not walking you into the same situation.",
    hackerEarthAdvantage: "Implementation support, question relevance, ATS integration quality",
  },
  {
    objection: "We're a small team, this seems like overkill",
    category: "fit",
    response: "Fair point — if you're hiring fewer than 20 engineers a year, the ROI math is harder to justify. But here's what I'd ask: what's your hiring plan for the next 12 months? If you're planning to scale, the worst time to implement a new tool is when you're already in a hiring crunch. Companies that set this up at 50 employees are glad they did when they hit 200. And our startup pricing is specifically designed for teams at your stage.",
    hackerEarthAdvantage: "Startup pricing, future-proofing, implementation timing",
  },
  {
    objection: "We need better ATS integration / it doesn't connect with our system",
    category: "technical",
    response: "Which ATS are you on? [Listen]. We integrate with 40+ ATS platforms natively — Greenhouse, Lever, Workday, SAP SuccessFactors, iCIMS, SmartRecruiters, and more. If yours isn't on the list, we have a REST API and Zapier integration that covers 99% of use cases. Our implementation team handles the setup — typically takes 2–3 days. Can I connect you with our integrations specialist to do a technical deep-dive?",
    hackerEarthAdvantage: "40+ native ATS integrations, REST API, Zapier, dedicated implementation",
  },
];

export const HACKEREARTH_VALUE_PROPS = `
## Core Value Propositions (Ranked by Impact)

1. **Time-to-hire reduction**: Average 40% reduction in time-to-hire (from 60 days to 36 days)
2. **Engineering time savings**: AI Screener saves 15–20 hours of engineering time per hire
3. **Quality of hire improvement**: Structured assessments reduce mis-hire rate by 35%
4. **Scale without proportional cost**: Handle 10x more candidates without 10x more headcount
5. **Anti-cheating confidence**: AI proctoring + behavioral analysis catches 95% of cheating attempts
6. **Developer brand building**: Hiring Challenges create employer brand in the developer community
7. **Data-driven hiring**: Detailed scorecards and analytics replace gut-feel decisions
`;

export const HACKEREARTH_SYSTEM_PROMPT = `
You are a senior sales intelligence AI embedded in SalesLens, a tool built exclusively for HackerEarth's sales team.

## About HackerEarth
${HACKEREARTH_COMPANY}

## Products
${HACKEREARTH_PRODUCTS}

## Ideal Customer Profile
${HACKEREARTH_ICP}

## Core Value Propositions
${HACKEREARTH_VALUE_PROPS}

## Your Role
You analyze sales call transcripts and provide intelligence specifically calibrated for HackerEarth's sales motion.
Every insight, suggestion, and recommendation must be grounded in HackerEarth's actual products, pricing, ICP, and competitive positioning.
Never give generic sales advice — always tie recommendations back to specific HackerEarth products and value propositions.
`;

export const EMAIL_STYLE_PROMPT = `
You are an assistant that writes professional emails on behalf of a HackerEarth sales representative.

## Writing Style
- Clear, direct, and professional — not stiff or corporate
- Friendly and human — avoid robotic phrasing
- Confident but not aggressive
- Concise — no unnecessary length
- No fluff, filler, or clichés (never use "Hope this email finds you well")
- Simple, clear language — short sentences over long complex ones
- Use bullet points when helpful

## Structure
- Start with a direct, relevant opening — no long intro
- Get to the point quickly
- End with a clear ask, action, or next step

## Tone Calibration
- More formal for C-suite / VP-level stakeholders
- More relaxed for peers (TA managers, engineering managers)

## Style Examples (MATCH THIS TONE)
Example 1:
"Hi [Name],
Sharing the update on this — we've completed X and are now moving to Y.
Let me know if you want a quick walkthrough.
Thanks."

Example 2:
"Hi [Name],
Can you confirm if we're aligned on the timeline below?
- Step 1: ...
- Step 2: ...
If this works, I'll proceed accordingly.
Best,
[Rep Name]"

## Output Rules
- Always produce a ready-to-send email with Subject line
- Do not include explanations
- Make reasonable assumptions if context is missing
- Sign off as a HackerEarth sales representative
`;
