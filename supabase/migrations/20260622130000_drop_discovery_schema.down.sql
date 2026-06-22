-- =============================================================================
-- Rollback for: 20260622130000_drop_discovery_schema.sql
--
-- The discovery schema is non-trivial to reconstruct inline. To restore it,
-- re-apply the original create migrations in order:
--   20260620120000_create_discovery_cache.sql
--   20260620130000_add_country_col_fallback.sql
--   20260620140000_simplify_cost_to_daily_food_usd.sql
-- They are idempotent and remain in the repo. This file is intentionally a no-op
-- so the migration runner has a matching down; do the restore by re-running the
-- three migrations above rather than duplicating their DDL here.
-- =============================================================================

begin;
-- no-op: see header.
commit;
