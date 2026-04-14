/**
 * SalesLens — Demo Seed Script
 * Run: node server/seed.mjs
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const connection = await mysql.createConnection(DATABASE_URL);
function ts(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d; }

const meetingsData = [
  { title: "HackerEarth Discovery Call — Accenture", platform: "zoom", accountName: "Accenture", contactName: "Priya Sharma", dealStage: "Discovery", status: "completed", scheduledAt: ts(14), createdAt: ts(14), transcriptText: "Priya: We're looking to overhaul our technical hiring pipeline. Rep: HackerEarth's automated screening can reduce manual effort by 80%. We have pre-built assessments for 900+ skills. Priya: How customizable are the assessments? Rep: Fully customizable. We also support pair programming simulations. Priya: What about integration with our ATS? We use Workday. Rep: We have a native Workday integration. Priya: Can you send a proposal? Rep: Absolutely. I'll have it over by end of week." },
  { title: "HackerEarth Demo — Infosys BPM", platform: "google_meet", accountName: "Infosys BPM", contactName: "Rajesh Kumar", dealStage: "Demo", status: "completed", scheduledAt: ts(10), createdAt: ts(10), transcriptText: "Rajesh: We saw your product at TechHR. We're hiring 2000 engineers this year. Rep: HackerEarth has AI-powered proctoring — screen recording, tab switching detection, and plagiarism checks. Rajesh: Show me the proctoring dashboard. Rep: Here you can see real-time flags. Rajesh: Can we white-label the platform? Rep: Yes, full white-labeling is included in the enterprise plan. Rajesh: I need to loop in our CHRO. Rep: I'll prepare an ROI analysis specific to your 2000-hire target." },
  { title: "HackerEarth Proposal Review — Wipro", platform: "teams", accountName: "Wipro", contactName: "Anita Desai", dealStage: "Proposal", status: "completed", scheduledAt: ts(7), createdAt: ts(7), transcriptText: "Anita: The pricing is higher than we expected. Rep: At 3000 hires per year, HackerEarth reduces screening time from 45 minutes to 8 minutes per candidate. Anita: Our legal team has questions about data residency. We need India data centers. Rep: We have data centers in Mumbai and Hyderabad. Anita: We need API access to push results into our internal HRMS. Rep: Our REST API is included. I'll connect you with our solutions engineer." },
  { title: "HackerEarth Negotiation — TCS", platform: "zoom", accountName: "Tata Consultancy Services", contactName: "Vikram Nair", dealStage: "Negotiation", status: "completed", scheduledAt: ts(3), createdAt: ts(3), transcriptText: "Vikram: We need a 20% discount on the annual contract. Rep: Can you commit to a 2-year contract? That would allow me to offer 15% off. Vikram: What if we do 18 months? Rep: 18 months at 12% discount. I can also throw in unlimited API calls for the first year. Vikram: We also need training for our 50 HR staff included. Rep: I can include 3 group training sessions. Vikram: We should be able to sign by end of month." },
  { title: "HackerEarth Onboarding Kickoff — Cognizant", platform: "zoom", accountName: "Cognizant", contactName: "Deepa Menon", dealStage: "Closed Won", status: "completed", scheduledAt: ts(1), createdAt: ts(1), transcriptText: "Deepa: We're excited to get started. Rep: I've assigned Arjun as your dedicated CSM. Deepa: Our IT team needs the SSO configuration details. Rep: I'll send the SAML configuration guide today. Deepa: We want to start with our Java developer assessments. Rep: We have 2,000+ Java questions ready. Deepa: Our CHRO wants a monthly report on assessment quality. Rep: We have an automated reporting feature. I'll configure it to send to your CHRO on the 1st of each month." },
];

console.log("Seeding meetings...");
const insertedIds = [];
for (const m of meetingsData) {
  const [result] = await connection.execute(
    "INSERT INTO meetings (title, platform, accountName, contactName, dealStage, status, scheduledAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [m.title, m.platform, m.accountName, m.contactName, m.dealStage, m.status, m.scheduledAt, m.createdAt, m.createdAt]
  );
  insertedIds.push(result.insertId);
  console.log("  + Meeting:", m.title, "(id=" + result.insertId + ")");
}

console.log("Seeding transcripts...");
for (let i = 0; i < meetingsData.length; i++) {
  const m = meetingsData[i]; const meetingId = insertedIds[i];
  if (!meetingId || !m.transcriptText) continue;
  const wordCount = m.transcriptText.split(/\s+/).length;
  await connection.execute("INSERT INTO transcripts (meetingId, fullText, wordCount, createdAt) VALUES (?, ?, ?, ?)", [meetingId, m.transcriptText, wordCount, m.createdAt]);
  console.log("  + Transcript for meeting", meetingId, "(" + wordCount + " words)");
}

console.log("Seeding action items...");
const actionItems = [
  { mi: 0, title: "Send proposal to Priya Sharma", desc: "Include Workday integration details and consulting firm case studies", priority: "high", status: "open" },
  { mi: 0, title: "Schedule technical demo with Accenture engineering leads", desc: "Coordinate with Priya for next week availability", priority: "high", status: "completed" },
  { mi: 1, title: "Prepare ROI analysis for Infosys 2000-hire target", desc: "Include time savings calculation and cost per hire reduction", priority: "urgent", status: "open" },
  { mi: 1, title: "Schedule CHRO presentation for Infosys", desc: "Leadership presentation with ROI focus", priority: "high", status: "open" },
  { mi: 2, title: "Send data processing agreement to Wipro legal", desc: "Include India data residency confirmation", priority: "urgent", status: "completed" },
  { mi: 2, title: "Connect Wipro with solutions engineer for HRMS integration", desc: "Map REST API to their internal system", priority: "medium", status: "open" },
  { mi: 3, title: "Send updated TCS contract with 12% discount", desc: "Include unlimited API calls and training sessions", priority: "urgent", status: "completed" },
  { mi: 3, title: "Follow up with TCS procurement on contract status", desc: "Check legal review progress", priority: "high", status: "open" },
  { mi: 4, title: "Send SAML SSO configuration guide to Cognizant IT", desc: "Include step-by-step setup instructions", priority: "high", status: "completed" },
  { mi: 4, title: "Schedule Java question bank review with Cognizant", desc: "Arjun to lead the session this week", priority: "medium", status: "open" },
];
for (const item of actionItems) {
  const meetingId = insertedIds[item.mi]; if (!meetingId) continue;
  await connection.execute("INSERT INTO action_items (meetingId, title, description, priority, status, isAiGenerated, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())", [meetingId, item.title, item.desc, item.priority, item.status]);
  console.log("  + Action item:", item.title);
}

console.log("Seeding prospects...");
const prospectsData = [
  { prospectCompanyName: "Deloitte India", prospectDomain: "deloitte.com", industry: "Consulting", companySize: "10001+", contactName: "Sanjay Mehta", contactTitle: "Head of Talent Acquisition", fitReason: "5000+ annual hires. Strong ICP match.", outreachAngle: "HackerEarth Assessments + FaceCode for technical interviews", triggerEvent: "Announced 20% headcount expansion in India for FY2025", suggestedProduct: "HackerEarth Assessments", status: "to_contact", notes: "Met at TechHR 2024. Decision maker confirmed." },
  { prospectCompanyName: "HCL Technologies", prospectDomain: "hcl.com", industry: "IT Services", companySize: "10001+", contactName: "Meena Krishnan", contactTitle: "VP Engineering Recruitment", fitReason: "8000+ annual engineering hires. Currently using HackerRank with quality complaints.", outreachAngle: "Superior question bank freshness + AI proctoring vs HackerRank", triggerEvent: "HackerRank contract renewal in Q2", suggestedProduct: "HackerEarth Assessments", status: "to_contact", notes: "Responded to cold email. Pain: high false positive rate." },
  { prospectCompanyName: "Tech Mahindra", prospectDomain: "techmahindra.com", industry: "IT Services", companySize: "10001+", contactName: "Pooja Iyer", contactTitle: "Chief People Officer", fitReason: "6000+ annual hires. Using internal tool with scalability issues.", outreachAngle: "Enterprise-grade platform to replace internal tool", triggerEvent: "Board-approved hiring expansion announced", suggestedProduct: "HackerEarth Assessments", status: "in_progress", notes: "Executive sponsor identified. Budget confirmed for H1." },
];
for (const p of prospectsData) {
  await connection.execute("INSERT INTO prospects (prospectCompanyName, prospectDomain, industry, companySize, contactName, contactTitle, fitReason, outreachAngle, triggerEvent, suggestedProduct, status, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())", [p.prospectCompanyName, p.prospectDomain, p.industry, p.companySize, p.contactName, p.contactTitle, p.fitReason, p.outreachAngle, p.triggerEvent, p.suggestedProduct, p.status, p.notes]);
  console.log("  + Prospect:", p.prospectCompanyName, "-", p.contactName);
}

console.log("\nSeed complete!");
await connection.end();
