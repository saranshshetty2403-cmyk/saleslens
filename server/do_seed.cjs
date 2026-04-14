const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check existing data
  const [existing] = await conn.execute('SELECT COUNT(*) as cnt FROM transcripts');
  if (existing[0].cnt > 0) {
    console.log('Data already seeded, skipping transcripts');
  } else {
    const [meetings] = await conn.execute('SELECT id, title FROM meetings ORDER BY id LIMIT 5');
    const transcripts = [
      'Priya: We are looking to overhaul our technical hiring pipeline. Rep: HackerEarth automated screening can reduce manual effort by 80 percent. We have pre-built assessments for 900 plus skills. Priya: How customizable are the assessments? Our engineering teams have very specific requirements. Rep: Fully customizable. You can build from scratch or use our library. We also support pair programming simulations. Priya: What about integration with our ATS? We use Workday. Rep: We have a native Workday integration. Setup takes about 2 days. Priya: Can you send a proposal? Rep: Absolutely. I will have it over by end of week. Should I include the Workday integration details? Priya: Yes please. Also include case studies from other consulting firms.',
      'Rajesh: We saw your product at TechHR. Looked impressive. We are hiring 2000 engineers this year. Rep: That is a significant ramp. Are you currently using any assessment platform? Rajesh: We use a competitor but we are unhappy with the candidate experience and the cheating detection. Rep: HackerEarth has AI-powered proctoring with screen recording, tab switching detection, and plagiarism checks. Rajesh: Show me the proctoring dashboard. Rep: Here you can see real-time flags. This candidate switched tabs 3 times. Rajesh: Can we white-label the platform? Our candidates should see the Infosys brand. Rep: Yes, full white-labeling is included in the enterprise plan. Rajesh: I need to loop in our CHRO. Can we do a leadership presentation next week? Rep: Absolutely. I will prepare an ROI analysis specific to your 2000-hire target.',
      'Anita: We reviewed the proposal. The pricing is higher than we expected. Rep: I understand. Let me walk you through the ROI. At 3000 hires per year, you are currently spending 45 minutes per candidate on manual screening. HackerEarth reduces that to 8 minutes. Anita: That is a significant time saving. But our budget is fixed for this quarter. Rep: We can structure the contract to start with your Q3 hiring volume and expand in Q4. Anita: Our legal team has questions about data residency. We need India data centers. Rep: We have data centers in Mumbai and Hyderabad. All candidate data stays within India. Anita: We need API access to push results into our internal HRMS. Rep: Our REST API is included. I will connect you with our solutions engineer to map the integration.',
      'Vikram: We are ready to move forward but need a 20 percent discount on the annual contract. Rep: I appreciate your commitment. Can you commit to a 2-year contract? That would allow me to offer 15 percent off. Vikram: 2 years is a long commitment. What if we do 18 months? Rep: 18 months at 12 percent discount. I can also throw in unlimited API calls for the first year. Vikram: We also need training for our 50 HR staff included. Rep: I can include 3 group training sessions and access to our LMS for 12 months. Vikram: What about dedicated support? Rep: For this contract size, I will include a dedicated CSM and 4-hour SLA for P1 issues. Vikram: That sounds reasonable. We should be able to sign by end of month.',
      'Deepa: Congratulations on closing the deal! We are excited to get started. Rep: Thank you Deepa. I have assigned Arjun as your dedicated CSM. Deepa: Our IT team needs the SSO configuration details. Rep: I will send the SAML configuration guide today. It typically takes 2 hours to set up. Deepa: We want to start with our Java developer assessments. Rep: Absolutely. We have 2000 plus Java questions ready. Deepa: We also need to train our HR team on the proctoring dashboard. Rep: We will run a 2-hour training session next Tuesday. Deepa: Our CHRO wants a monthly report on assessment quality and candidate pipeline metrics. Rep: We have an automated reporting feature. I will configure it to send to your CHRO on the 1st of each month.'
    ];
    
    for (let i = 0; i < meetings.length; i++) {
      const wc = transcripts[i].split(/\s+/).length;
      await conn.execute('INSERT INTO transcripts (`meetingId`, `fullText`, `wordCount`, `createdAt`) VALUES (?, ?, ?, NOW())', [meetings[i].id, transcripts[i], wc]);
      console.log('+ Transcript for meeting', meetings[i].id, '(' + wc + ' words)');
    }
  }
  
  // Action items
  const [aiCount] = await conn.execute('SELECT COUNT(*) as cnt FROM action_items');
  if (aiCount[0].cnt > 0) {
    console.log('Action items already seeded');
  } else {
    const [meetings] = await conn.execute('SELECT id FROM meetings ORDER BY id LIMIT 5');
    const items = [
      [meetings[0].id, 'Send proposal to Priya Sharma', 'Include Workday integration details and consulting firm case studies', 'high', 'open'],
      [meetings[0].id, 'Schedule technical demo with Accenture engineering leads', 'Coordinate with Priya for next week availability', 'high', 'completed'],
      [meetings[1].id, 'Prepare ROI analysis for Infosys 2000-hire target', 'Include time savings calculation and cost per hire reduction', 'urgent', 'open'],
      [meetings[1].id, 'Schedule CHRO presentation for Infosys', 'Leadership presentation with ROI focus', 'high', 'open'],
      [meetings[2].id, 'Send data processing agreement to Wipro legal', 'Include India data residency confirmation', 'urgent', 'completed'],
      [meetings[2].id, 'Connect Wipro with solutions engineer for HRMS integration', 'Map REST API to their internal system', 'medium', 'open'],
      [meetings[3].id, 'Send updated TCS contract with 12 percent discount', 'Include unlimited API calls and training sessions', 'urgent', 'completed'],
      [meetings[3].id, 'Follow up with TCS procurement on contract status', 'Check legal review progress', 'high', 'open'],
      [meetings[4].id, 'Send SAML SSO configuration guide to Cognizant IT', 'Include step-by-step setup instructions', 'high', 'completed'],
      [meetings[4].id, 'Schedule Java question bank review with Cognizant', 'Arjun to lead the session this week', 'medium', 'open'],
    ];
    for (const item of items) {
      await conn.execute('INSERT INTO action_items (`meetingId`, `title`, `description`, `priority`, `status`, `isAiGenerated`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())', item);
      console.log('+ Action item:', item[1]);
    }
  }
  
  // Prospects
  const [pCount] = await conn.execute('SELECT COUNT(*) as cnt FROM prospects');
  if (pCount[0].cnt > 0) {
    console.log('Prospects already seeded');
  } else {
    const prospects = [
      ['Deloitte India', 'deloitte.com', 'Consulting', '10001+', 'Sanjay Mehta', 'Head of Talent Acquisition', '5000+ annual hires. Strong ICP match.', 'HackerEarth Assessments + FaceCode for technical interviews', 'Announced 20% headcount expansion in India for FY2025', 'HackerEarth Assessments', 'to_contact', 'Met at TechHR 2024. Decision maker confirmed.'],
      ['HCL Technologies', 'hcl.com', 'IT Services', '10001+', 'Meena Krishnan', 'VP Engineering Recruitment', '8000+ annual engineering hires. Currently using HackerRank with quality complaints.', 'Superior question bank freshness + AI proctoring vs HackerRank', 'HackerRank contract renewal in Q2', 'HackerEarth Assessments', 'to_contact', 'Responded to cold email. Pain: high false positive rate.'],
      ['Tech Mahindra', 'techmahindra.com', 'IT Services', '10001+', 'Pooja Iyer', 'Chief People Officer', '6000+ annual hires. Using internal tool with scalability issues.', 'Enterprise-grade platform to replace internal tool', 'Board-approved hiring expansion announced', 'HackerEarth Assessments', 'in_progress', 'Executive sponsor identified. Budget confirmed for H1.'],
    ];
    for (const p of prospects) {
      await conn.execute('INSERT INTO prospects (`prospectCompanyName`, `prospectDomain`, `industry`, `companySize`, `contactName`, `contactTitle`, `fitReason`, `outreachAngle`, `triggerEvent`, `suggestedProduct`, `status`, `notes`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())', p);
      console.log('+ Prospect:', p[0]);
    }
  }
  
  console.log('Seed complete!');
  await conn.end();
}
main().catch(console.error);
