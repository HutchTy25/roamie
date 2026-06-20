-- =============================================================================
-- Rollback for: 20260620140000_simplify_cost_to_daily_food_usd.sql
-- Restores the prior index-based columns and drops daily_food_cost_usd. Safe
-- because both tables are empty (NOT NULL re-adds need no default). IF EXISTS
-- throughout. Does not touch bookings / trips / couples.
-- =============================================================================

begin;

-- destination_facts: restore col_index + food_per_day_usd + daily_cost_usd.
alter table destination_facts
  add column if not exists col_index        numeric(6, 2),
  add column if not exists food_per_day_usd numeric(10, 2),
  add column if not exists daily_cost_usd   numeric(10, 2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'destination_facts_col_nonneg') then
    alter table destination_facts add constraint destination_facts_col_nonneg
      check (col_index is null or col_index >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'destination_facts_food_nonneg') then
    alter table destination_facts add constraint destination_facts_food_nonneg
      check (food_per_day_usd is null or food_per_day_usd >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'destination_facts_daily_nonneg') then
    alter table destination_facts add constraint destination_facts_daily_nonneg
      check (daily_cost_usd is null or daily_cost_usd >= 0);
  end if;
end
$$;

alter table destination_facts drop constraint if exists destination_facts_daily_food_nonneg;
alter table destination_facts drop column if exists daily_food_cost_usd;

-- country_cost_index: restore col_index (NOT NULL).
alter table country_cost_index
  add column if not exists col_index numeric(6, 2) not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'country_cost_index_col_nonneg') then
    alter table country_cost_index add constraint country_cost_index_col_nonneg
      check (col_index >= 0);
  end if;
end
$$;

alter table country_cost_index drop constraint if exists country_cost_index_daily_food_nonneg;
alter table country_cost_index drop column if exists daily_food_cost_usd;

commit;
