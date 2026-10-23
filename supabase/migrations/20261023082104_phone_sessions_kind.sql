-- PF-26: what kind of session a recording is (Czedrick, 2026-10-23).
--
-- WHY. The recorder keeps every session on a plugged-in phone, and Yurie
-- does manual warmups on the phones as well as posting: on the recorder's
-- first night two 50-minute sessions on phone 1 were her switching to the
-- Sarah Keller accounts and leaving them open, which the Sessions page could
-- only call "No post". Claude's read of a session now says what kind it saw,
-- and a reviewer can overrule it; the list shows the label.
--
--   kind         'posting' | 'manual_warmup' | 'other'; null until a read or a
--                reviewer sets it
--   kind_set_by  'claude' when the read set it, 'reviewer' when a person did;
--                a reviewer's choice is kept when the session is read again
alter table public.phone_sessions
  add column if not exists kind text
    check (kind in ('posting', 'manual_warmup', 'other')),
  add column if not exists kind_set_by text
    check (kind_set_by in ('claude', 'reviewer'));

comment on column public.phone_sessions.kind is
  'PF-26: what the session was: posting, manual_warmup or other. Set by Claude''s read, or by a reviewer (kind_set_by).';
comment on column public.phone_sessions.kind_set_by is
  'PF-26: claude or reviewer. A reviewer''s choice is kept when the session is read again.';
