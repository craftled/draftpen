-- Add trial fields to subscription table for Polar trial period tracking
ALTER TABLE "subscription" ADD COLUMN "trialStart" timestamp;
ALTER TABLE "subscription" ADD COLUMN "trialEnd" timestamp;
