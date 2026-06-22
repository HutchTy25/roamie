-- =============================================================================
-- Migration: add 'activity' to the booking_category enum
-- Purpose:   The add-reservation form offers Flight/Hotel/Transport/Activity/
--            Other; the enum shipped without 'activity'. Add it.
--
-- NOTE: ALTER TYPE ... ADD VALUE must NOT run inside a transaction block, so this
-- migration intentionally has no begin/commit wrapper. IF NOT EXISTS makes it
-- idempotent (no-op on a fresh DB where the create-migration already lists it).
-- Enum values cannot be removed, so the .down is a documented no-op.
-- =============================================================================

alter type booking_category add value if not exists 'activity';
