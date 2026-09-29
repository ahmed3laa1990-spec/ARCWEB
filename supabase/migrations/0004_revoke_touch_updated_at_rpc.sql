-- Trigger-only helper; it was reachable as /rest/v1/rpc/touch_updated_at.
-- Triggers keep working: EXECUTE is checked when a trigger is created, not when it fires.
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
