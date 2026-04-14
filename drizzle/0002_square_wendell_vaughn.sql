ALTER TABLE `ai_analyses` MODIFY COLUMN `painPoints` json;--> statement-breakpoint
ALTER TABLE `ai_analyses` MODIFY COLUMN `objections` json;--> statement-breakpoint
ALTER TABLE `ai_analyses` MODIFY COLUMN `buyingSignals` json;--> statement-breakpoint
ALTER TABLE `ai_analyses` MODIFY COLUMN `nextSteps` json;--> statement-breakpoint
ALTER TABLE `ai_analyses` MODIFY COLUMN `keyQuotes` json;--> statement-breakpoint
ALTER TABLE `ai_analyses` MODIFY COLUMN `talkRatio` json;--> statement-breakpoint
ALTER TABLE `meetings` MODIFY COLUMN `participants` json;--> statement-breakpoint
ALTER TABLE `transcripts` MODIFY COLUMN `segments` json;--> statement-breakpoint
ALTER TABLE `transcripts` MODIFY COLUMN `speakerMap` json;