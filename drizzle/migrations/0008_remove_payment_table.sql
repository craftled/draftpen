-- Migration: Remove legacy payment table
-- Safe to run multiple times
BEGIN;
  DROP TABLE IF EXISTS "payment";
COMMIT;

