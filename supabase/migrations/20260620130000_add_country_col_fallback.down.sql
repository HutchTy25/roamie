-- =============================================================================
-- Rollback for: 20260620130000_add_country_col_fallback.sql
-- Drops the country_cost_index table (cascades its policy/index/trigger) and the
-- destination_facts.is_estimated column. Leaves the shared set_updated_at()
-- function in place if any other trigger still uses it. All steps IF EXISTS.
-- =============================================================================

begin;

drop table if exists country_cost_index;

alter table destination_facts drop column if exists is_estimated;

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
