CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recallApiKey` text,
	`botName` varchar(255) DEFAULT 'SalesLens Bot',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`)
);
