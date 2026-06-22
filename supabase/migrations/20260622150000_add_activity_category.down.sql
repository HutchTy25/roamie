-- =============================================================================
-- Rollback for: 20260622150000_add_activity_category.sql
-- PostgreSQL cannot drop a value from an enum type, so this is a no-op. Removing
-- 'activity' would require recreating booking_category and rewriting every
-- dependent column — out of scope for a routine rollback.
-- =============================================================================

-- no-op (see header)
