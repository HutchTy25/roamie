-- =============================================================================
-- Rollback for: 20260620120000_create_discovery_cache.sql
-- Reverses, in dependency order: tables (each cascades its own RLS policy,
-- indexes, trigger) -> enum type. The shared set_updated_at() function is left
-- in place when any other trigger still depends on it. All steps IF EXISTS.
-- =============================================================================

begin;

-- 1. Tables. DROP TABLE cascades the RLS policy, indexes, and updated_at trigger
--    attached to each.
drop table if exists discovery_cache;
drop table if exists destination_facts;

-- 2. Provenance enum. Safe now that its only consumer (destination_facts) is gone.
drop type if exists cost_data_source;

-- 3. Shared updated_at function: drop only if nothing else still uses it
--    (bookings and any other table may share it).
do $$
begin
  if not exists (
    select 1
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    where p.proname = 'set_updated_at'
      and not tg.tgisinternal
  ) then
    drop function if exists set_updated_at();
  end if;
end
$$;

commit;
