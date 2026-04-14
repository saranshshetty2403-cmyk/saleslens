CREATE TABLE `action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int,
	`title` varchar(512) NOT NULL,
	`description` text,
	`dueDate` timestamp,
	`status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`assignee` varchar(255),
	`isAiGenerated` boolean DEFAULT false,
	`sourceQuote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `action_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`summary` text,
	`painPoints` json DEFAULT ('[]'),
	`objections` json DEFAULT ('[]'),
	`buyingSignals` json DEFAULT ('[]'),
	`nextSteps` json DEFAULT ('[]'),
	`keyQuotes` json DEFAULT ('[]'),
	`dealScore` float,
	`sentiment` enum('positive','neutral','negative','mixed'),
	`talkRatio` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_analyses_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_analyses_meetingId_unique` UNIQUE(`meetingId`)
);
--> statement-breakpoint
CREATE TABLE `meddpicc_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`metrics` text,
	`metricsConfidence` float,
	`metricsAiGenerated` boolean DEFAULT true,
	`economicBuyer` text,
	`economicBuyerConfidence` float,
	`economicBuyerAiGenerated` boolean DEFAULT true,
	`decisionCriteria` text,
	`decisionCriteriaConfidence` float,
	`decisionCriteriaAiGenerated` boolean DEFAULT true,
	`decisionProcess` text,
	`decisionProcessConfidence` float,
	`decisionProcessAiGenerated` boolean DEFAULT true,
	`paperProcess` text,
	`paperProcessConfidence` float,
	`paperProcessAiGenerated` boolean DEFAULT true,
	`identifyPain` text,
	`identifyPainConfidence` float,
	`identifyPainAiGenerated` boolean DEFAULT true,
	`champion` text,
	`championConfidence` float,
	`championAiGenerated` boolean DEFAULT true,
	`competition` text,
	`competitionConfidence` float,
	`competitionAiGenerated` boolean DEFAULT true,
	`overallCompleteness` float DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meddpicc_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `meddpicc_reports_meetingId_unique` UNIQUE(`meetingId`)
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`platform` enum('zoom','google_meet','teams','slack','webex','other') NOT NULL DEFAULT 'zoom',
	`meetingUrl` text,
	`recallBotId` varchar(128),
	`status` enum('scheduled','joining','recording','processing','completed','failed') NOT NULL DEFAULT 'scheduled',
	`accountName` varchar(255),
	`contactName` varchar(255),
	`dealStage` varchar(128),
	`participants` json DEFAULT ('[]'),
	`scheduledAt` timestamp,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`durationSeconds` int,
	`recordingUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int,
	`title` varchar(255),
	`content` text,
	`templateType` enum('free_form','discovery','demo','follow_up','custom') DEFAULT 'free_form',
	`isAiGenerated` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spiced_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`situation` text,
	`situationConfidence` float,
	`situationAiGenerated` boolean DEFAULT true,
	`pain` text,
	`painConfidence` float,
	`painAiGenerated` boolean DEFAULT true,
	`impact` text,
	`impactConfidence` float,
	`impactAiGenerated` boolean DEFAULT true,
	`criticalEvent` text,
	`criticalEventConfidence` float,
	`criticalEventAiGenerated` boolean DEFAULT true,
	`decision` text,
	`decisionConfidence` float,
	`decisionAiGenerated` boolean DEFAULT true,
	`overallCompleteness` float DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spiced_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `spiced_reports_meetingId_unique` UNIQUE(`meetingId`)
);
--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`fullText` text,
	`segments` json DEFAULT ('[]'),
	`speakerMap` json DEFAULT ('{}'),
	`language` varchar(16) DEFAULT 'en',
	`wordCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transcripts_id` PRIMARY KEY(`id`)
);
