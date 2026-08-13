-- HomeOS: harden household owner membership sync.
-- Safe to run more than once.

alter table public.households enable row level security;
alter table public.household_members enable row level security;

drop policy if exists households_owner_update on public.households;
create policy households_owner_update
on public.households
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.ensure_household_owner_member(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.households h
    where h.id = target
      and h.owner_id = auth.uid()
  ) then
    raise exception 'Household owner check failed';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target, auth.uid(), 'owner')
  on conflict (household_id, user_id)
  do update set role = excluded.role;
end;
$$;

revoke all on function public.ensure_household_owner_member(uuid) from public;
grant execute on function public.ensure_household_owner_member(uuid) to authenticated;

create or replace function public.add_household_owner_member_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (household_id, user_id)
  do update set role = excluded.role;
  return new;
end;
$$;

drop trigger if exists households_add_owner_member on public.households;
create trigger households_add_owner_member
after insert on public.households
for each row
execute function public.add_household_owner_member_after_insert();
