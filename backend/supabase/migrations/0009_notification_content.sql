-- 0009: structured notification content.
--
-- notifications previously had a single `message` text column, so every
-- notification rendered as one line with no body and no link to the related
-- entity (meal plan, feedback, ...). Add a title/body split plus a generic
-- reference (ref_type, ref_id) so the detail view can show the full content and
-- deep-link to the source. `message` is kept and still populated for backward
-- compatibility (the frontend falls back to it when title is null).

alter table public.notifications
    add column title    text,
    add column body     text,
    add column ref_type text,   -- e.g. 'meal_plan' | 'feedback' | 'task' | 'announcement'
    add column ref_id   uuid;   -- the related row's id, when applicable
