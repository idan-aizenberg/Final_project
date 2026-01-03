-- Bulk min_temperature updater (fast, resumable)
-- Run this once in Supabase Dashboard -> SQL Editor

create or replace function public.bulk_update_min_temperature(
  p_day integer,
  p_grid_indices integer[],
  p_min_temperatures double precision[],
  p_year integer default 2025
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  -- Avoid Supabase statement timeouts on large bulk updates
  perform set_config('statement_timeout', '0', true);

  if array_length(p_grid_indices, 1) is distinct from array_length(p_min_temperatures, 1) then
    raise exception 'Array length mismatch: grid_indices=% min_temperatures=%',
      array_length(p_grid_indices, 1),
      array_length(p_min_temperatures, 1);
  end if;

  with data as (
    select
      unnest(p_grid_indices) as grid_index,
      unnest(p_min_temperatures) as min_temperature
  )
  update weather_forecasts wf
  set min_temperature = data.min_temperature
  from data
  where wf.grid_index = data.grid_index
    and wf.day_of_year = p_day
    and wf.forecast_year = p_year
    and wf.min_temperature is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.bulk_update_min_temperature(integer, integer[], double precision[], integer) to service_role;
grant execute on function public.bulk_update_min_temperature(integer, integer[], double precision[], integer) to authenticated;


