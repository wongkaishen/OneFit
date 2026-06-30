-- 0015: drop the unused specialist credential-approval artifacts.
--
-- Specialist admin approval is gated on public.profiles.status ('pending' ->
-- 'active'/'suspended'); the wellness_specialists.approval_status column and the
-- specialist_approval enum were never read or written by the app and are removed.
alter table public.wellness_specialists drop column if exists approval_status;
drop type if exists specialist_approval;
