-- Migration: Remove legacy DodoPayments table
-- Safe to run multiple times
BEGIN;
  DROP TABLE IF EXISTS "payment";
COMMIT;

