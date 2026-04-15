CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`normalizedName` varchar(255) NOT NULL,
	`domain` varchar(255),
	`industry` varchar(255),
	`companySize` varchar(128),
	`primaryContactName` varchar(255),
	`primaryContactTitle` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deal_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`consolidatedMeddpicc` json,
	`consolidatedSpiced` json,
	`dealHealthScore` float,
	`dealHealthTrend` json,
	`dealNarrative` text,
	`keyRisks` json,
	`momentumSignals` json,
	`recommendedNextAction` text,
	`callCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deal_summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `app_settings` ADD `emailStyleProfile` json;--> statement-breakpoint
ALTER TABLE `generated_emails` ADD `accepted` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `generated_emails` ADD `userEdits` text;--> statement-breakpoint
ALTER TABLE `generated_emails` ADD `styleNotes` text;--> statement-breakpoint
ALTER TABLE `meetings` ADD `accountId` int;--> statement-breakpoint
ALTER TABLE `meetings` ADD `contactTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `meetings` ADD `dealValue` varchar(128);