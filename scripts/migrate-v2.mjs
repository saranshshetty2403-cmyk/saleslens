import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const statements = [
  // app_settings columns
  "ALTER TABLE `app_settings` ADD COLUMN IF NOT EXISTS `ollamaEndpoint` varchar(512) DEFAULT 'http://localhost:11434'",
  "ALTER TABLE `app_settings` ADD COLUMN IF NOT EXISTS `ollamaModel` varchar(128) DEFAULT 'llama3.1:8b'",
  "ALTER TABLE `app_settings` ADD COLUMN IF NOT EXISTS `whisperEndpoint` varchar(512) DEFAULT 'http://localhost:8001'",
  // meetings column
  "ALTER TABLE `meetings` ADD COLUMN IF NOT EXISTS `transcriptText` mediumtext",
  // pitch_coaching
  `CREATE TABLE IF NOT EXISTS \`pitch_coaching\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`meetingId\` int NOT NULL,
    \`overallScore\` float,
    \`talkTimeRatio\` float,
    \`discoveryScore\` float,
    \`objectionScore\` float,
    \`valueScore\` float,
    \`nextStepScore\` float,
    \`closingScore\` float,
    \`moments\` json,
    \`strengths\` json,
    \`improvements\` json,
    \`missedOpportunities\` json,
    \`competitorsMentioned\` json,
    \`battlecardUsed\` boolean DEFAULT false,
    \`meddpiccCoverage\` float,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`pitch_coaching_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`pitch_coaching_meetingId_unique\` UNIQUE(\`meetingId\`)
  )`,
  // pre_call_intelligence
  `CREATE TABLE IF NOT EXISTS \`pre_call_intelligence\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`meetingId\` int NOT NULL,
    \`companyName\` varchar(255),
    \`companyDomain\` varchar(255),
    \`industry\` varchar(128),
    \`companySize\` varchar(64),
    \`fundingStage\` varchar(64),
    \`recentNews\` json,
    \`techStack\` json,
    \`currentTools\` json,
    \`triggerEvents\` json,
    \`prepBullets\` json,
    \`suggestedOpening\` text,
    \`leadWithProduct\` varchar(128),
    \`buyerPersona\` varchar(128),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`pre_call_intelligence_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`pre_call_intelligence_meetingId_unique\` UNIQUE(\`meetingId\`)
  )`,
  // prospects
  `CREATE TABLE IF NOT EXISTS \`prospects\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`sourceCompanyName\` varchar(255),
    \`prospectCompanyName\` varchar(255) NOT NULL,
    \`prospectDomain\` varchar(255),
    \`industry\` varchar(128),
    \`companySize\` varchar(64),
    \`fundingStage\` varchar(64),
    \`contactName\` varchar(255),
    \`contactTitle\` varchar(255),
    \`contactLinkedin\` varchar(512),
    \`fitReason\` text,
    \`outreachAngle\` text,
    \`triggerEvent\` text,
    \`suggestedProduct\` varchar(128),
    \`status\` enum('to_contact','contacted','in_progress','converted','not_a_fit') NOT NULL DEFAULT 'to_contact',
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`prospects_id\` PRIMARY KEY(\`id\`)
  )`,
  // generated_emails
  `CREATE TABLE IF NOT EXISTS \`generated_emails\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`meetingId\` int,
    \`prospectId\` int,
    \`emailType\` enum('follow_up','cold_outreach','objection_response','demo_follow_up','proposal_follow_up','custom') NOT NULL DEFAULT 'follow_up',
    \`subject\` varchar(512),
    \`body\` text,
    \`context\` text,
    \`recipientName\` varchar(255),
    \`recipientTitle\` varchar(255),
    \`recipientCompany\` varchar(255),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`generated_emails_id\` PRIMARY KEY(\`id\`)
  )`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.trim().slice(0, 70));
  } catch (e) {
    console.log('SKIP:', e.message.slice(0, 100));
  }
}

await conn.end();
console.log('\n✅ Migration v2 complete');
