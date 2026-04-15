CREATE TABLE `generated_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int,
	`prospectId` int,
	`emailType` enum('follow_up','cold_outreach','objection_response','demo_follow_up','proposal_follow_up','custom') NOT NULL DEFAULT 'follow_up',
	`subject` varchar(512),
	`body` text,
	`context` text,
	`recipientName` varchar(255),
	`recipientTitle` varchar(255),
	`recipientCompany` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_emails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pitch_coaching` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`overallScore` float,
	`talkTimeRatio` float,
	`discoveryScore` float,
	`objectionScore` float,
	`valueScore` float,
	`nextStepScore` float,
	`closingScore` float,
	`moments` json,
	`strengths` json,
	`improvements` json,
	`missedOpportunities` json,
	`competitorsMentioned` json,
	`battlecardUsed` boolean DEFAULT false,
	`meddpiccCoverage` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pitch_coaching_id` PRIMARY KEY(`id`),
	CONSTRAINT `pitch_coaching_meetingId_unique` UNIQUE(`meetingId`)
);
--> statement-breakpoint
CREATE TABLE `pre_call_intelligence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`companyName` varchar(255),
	`companyDomain` varchar(255),
	`industry` text,
	`companySize` text,
	`fundingStage` text,
	`recentNews` json,
	`techStack` json,
	`currentTools` json,
	`triggerEvents` json,
	`prepBullets` json,
	`suggestedOpening` text,
	`leadWithProduct` text,
	`buyerPersona` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pre_call_intelligence_id` PRIMARY KEY(`id`),
	CONSTRAINT `pre_call_intelligence_meetingId_unique` UNIQUE(`meetingId`)
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceCompanyName` varchar(255),
	`prospectCompanyName` varchar(255) NOT NULL,
	`prospectDomain` varchar(255),
	`industry` text,
	`companySize` text,
	`fundingStage` text,
	`contactName` varchar(255),
	`contactTitle` varchar(255),
	`contactLinkedin` varchar(512),
	`fitReason` text,
	`outreachAngle` text,
	`triggerEvent` text,
	`suggestedProduct` varchar(128),
	`status` enum('to_contact','contacted','in_progress','converted','not_a_fit') NOT NULL DEFAULT 'to_contact',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `app_settings` MODIFY COLUMN `botName` varchar(255) DEFAULT 'SalesLens';--> statement-breakpoint
ALTER TABLE `app_settings` ADD `ollamaEndpoint` varchar(512) DEFAULT 'http://localhost:11434';--> statement-breakpoint
ALTER TABLE `app_settings` ADD `ollamaModel` varchar(128) DEFAULT 'llama3.1:8b';--> statement-breakpoint
ALTER TABLE `app_settings` ADD `whisperEndpoint` varchar(512) DEFAULT 'http://localhost:8001';--> statement-breakpoint
ALTER TABLE `app_settings` DROP COLUMN `recallApiKey`;