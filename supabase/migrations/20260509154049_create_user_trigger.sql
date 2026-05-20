create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."User" (id, email, "updatedAt")
  values (new.id, new.email, current_timestamp);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();