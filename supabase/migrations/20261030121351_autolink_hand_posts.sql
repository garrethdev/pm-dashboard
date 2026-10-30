-- The robots attach the link to a hand-posted post, so Yurie does not have to
-- (Garreth, 2026-10-30).
--
-- WHY. Every post Yurie makes by hand has asked her to copy its link on the
-- phone and paste it into the To-do sheet. With more accounts that is the
-- slowest part of her day, and the links were often wrong: of 82 Facebook
-- posts marked posted by 2026-10-29, about 67 carried an Instagram link, two
-- TikTok items had the caption pasted in, and two TikTok links pointed at the
-- wrong video. The analytics robots already read every one of those posts
-- within about a day, captions included.
--
-- HOW A POST IS FOUND. Each hand-out is a known piece of content handed to one
-- account, so its caption is known. A robot post on that SAME account, posted
-- no earlier than a day before the hand-out, whose caption starts the same way
-- is that post. Only the posts handed to that one account are compared, which
-- is what makes a short caption safe: the old fleet-wide matcher
-- (match_content_id) refuses anything under 30 characters because across
-- every lane it could hit the wrong post. Both captions are first put in one
-- form: lower case, curly quotes straightened, runs of spaces made one, first
-- 40 characters. The iPhone turns ' into ’ when a caption is pasted, and that
-- alone was why 7 of the 10 Instagram posts the old matcher missed went
-- unmatched.
--
-- A match is used only when it is one-to-one: the hand-out has exactly one
-- candidate post and that post is a candidate for exactly one hand-out. A
-- wrong link is worse than a missing one, and a missing one still reaches
-- Yurie as Link needed two days later (todo.ts).
--
-- REPLAYED BEFORE WRITING, against every post marked posted up to 2026-10-29:
-- Instagram 61 of 78 found, all 61 the post Yurie linked; TikTok 55 of 68
-- found, 51 the post she linked and the other 2 cases her link was the wrong
-- one; Facebook 72 of 82 found, against 10 the Facebook robot could match from
-- her links, and those 10 agreed. What is not found is mostly a post the robot
-- has not read (an account not connected to analytics, or too recent).
--
-- WHAT A MATCH DOES.
--  * A hand-out with no link gets the robot's link. A SCHEDULED one also
--    becomes posted: the robot seeing it is the proof it went live, which is
--    what pasting the link did by hand (route.ts, action "link").
--  * The robot's row gets the content id where it has none (carousel_id, and
--    for Facebook delivery_id too), so the analytics pages count the post
--    under its content type. A link Yurie already pasted is never replaced.
--  * Each auto-link is written to dashboard_audit_log as
--    system:autolink / delivery_autolink.
--
-- WHEN IT RUNS. No timer and nothing in n8n: whichever happens second.
--  * A robot saves posts (any of the three tables, whichever robot wrote
--    them, n8n or the dashboard's own Facebook robot).
--  * A hand-out is ticked posted or scheduled with no link.
-- It also runs when a robot UPDATES a recent post that has no content id, so
-- if a re-read ever writes the content id back to empty it is filled again.
-- Every path swallows its own errors: a robot's save or Yurie's tick must
-- never fail because the matching did.
--
-- FACEBOOK FOLLOWS INSTAGRAM. Yurie cross-posts from Instagram to Facebook
-- (Garreth, 2026-10-30), so a Facebook copy (mirror_of set) now takes its
-- Instagram twin's status when that changes: posted, scheduled, failed, or
-- back on the list. Only a copy still in the twin's old state follows, so one
-- she ticked on its own is left alone. Its link then comes from the Facebook
-- robot like any other post.
--
-- SECURITY DEFINER because the robots write with whatever key their workflow
-- holds (some n8n ones use the public key) and post_deliveries is service-role
-- only; without it the trigger would see no hand-outs. EXECUTE is revoked from
-- anon and authenticated by name, since "from public" leaves those grants
-- standing.


-- ─────────────────────────────────────────────────────────────────────────────
-- One form for a caption, so two copies of the same text compare equal.
create or replace function public.caption_match_key(p_caption text)
returns text
language sql
immutable
as $$
  select left(btrim(regexp_replace(lower(translate(p_caption, '’‘“”', '''''""')), '\s+', ' ', 'g')), 40)
$$;

comment on function public.caption_match_key(text) is
  'Autolink: a caption in one comparable form (lower case, straight quotes, single spaces, first 40 characters).';


-- ─────────────────────────────────────────────────────────────────────────────
-- The caption of a hand-out's content row, read straight from its own table.
-- Not from unified_posts: that view unions every lane and took ~1.9 s for one
-- account, too slow for something a robot's save waits on.
create or replace function public.hand_post_caption(p_content_type text, p_source_table text, p_source_id text)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_id_col  text;
  v_cap_col text;
  v_fields  jsonb;
  v_caption text;
begin
  select source_id_column, audit_fields into v_id_col, v_fields
    from content_type_registry
   where content_type = p_content_type
   limit 1;
  if v_id_col is null or p_source_table is null then
    return null;
  end if;

  -- The first caption column the registry names is the one the To-do sheet
  -- copies; the rest are alternates.
  v_cap_col := coalesce(
    nullif(btrim(case jsonb_typeof(v_fields -> 'caption')
                   when 'array'  then v_fields -> 'caption' ->> 0
                   when 'string' then v_fields ->> 'caption'
                 end), ''),
    'caption');

  execute format('select %I::text from public.%I where %I::text = $1 limit 1', v_cap_col, p_source_table, v_id_col)
     into v_caption
    using p_source_id;
  return v_caption;
exception
  when undefined_column or undefined_table then
    return null;
end;
$$;

comment on function public.hand_post_caption(text, text, text) is
  'Autolink: the caption of a hand-out''s content row, looked up through content_type_registry.';


-- ─────────────────────────────────────────────────────────────────────────────
-- Match one account's hand-outs to the posts its robot has read. Returns how
-- many hand-outs were given a link.
create or replace function public.autolink_hand_posts(
  p_account_id bigint,
  p_since timestamptz default now() - interval '14 days'
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_platform text;
  v_handle   text;
  v_linked   integer := 0;
  m          record;
begin
  select lower(platform), lower(username) into v_platform, v_handle
    from accounts
   where id = p_account_id;
  if v_handle is null or v_platform not in ('tiktok', 'instagram', 'facebook') then
    return 0;
  end if;

  for m in
    with d as (
      select d.id,
             d.status,
             d.source_id,
             d.created_at,
             nullif(btrim(d.post_url), '') as post_url,
             caption_match_key(hand_post_caption(d.content_type, d.source_table, d.source_id)) as k
        from post_deliveries d
       where d.account_id = p_account_id
         and d.status in ('posted', 'scheduled')
         and d.created_at >= p_since
    ),
    -- Only the platform's own table is read; the other two branches are cut
    -- before they scan.
    r as (
      select post_id, post_url, posted_at, caption_match_key(caption_snippet) as k, null::bigint as delivery_id
        from tt_post_performance
       where v_platform = 'tiktok' and account = v_handle and posted_at >= p_since - interval '1 day'
      union all
      select post_id, post_url, posted_at, caption_match_key(caption_snippet), null::bigint
        from post_performance
       where v_platform = 'instagram' and account = v_handle and posted_at >= p_since - interval '1 day'
      union all
      select post_id, post_url, posted_at, caption_match_key(caption_snippet), delivery_id
        from fb_post_performance
       where v_platform = 'facebook' and account = v_handle and posted_at >= p_since - interval '1 day'
    ),
    c as (
      select d.id as delivery_id, d.status, d.source_id, d.post_url as had_url,
             r.post_id, r.post_url, r.posted_at
        from d
        join r
          on r.posted_at > d.created_at - interval '1 day'
         and length(d.k) >= 12
         and length(r.k) >= 12
         and (starts_with(r.k, d.k) or starts_with(d.k, r.k))
         -- A Facebook post already tied to another hand-out is taken.
         and (r.delivery_id is null or r.delivery_id = d.id)
         -- So is a post whose link another hand-out of this account carries.
         and not exists (select 1 from d d2 where d2.id <> d.id and d2.post_url = r.post_url)
    )
    select distinct on (c.delivery_id) c.*
      from c
     where (select count(distinct c2.post_id) from c c2 where c2.delivery_id = c.delivery_id) = 1
       and (select count(distinct c3.delivery_id) from c c3 where c3.post_id = c.post_id) = 1
     order by c.delivery_id
  loop
    if m.had_url is null and m.post_url is not null then
      update post_deliveries
         set post_url   = m.post_url,
             status     = 'posted',
             -- A scheduled post counts as finished the moment it went live.
             done_at    = case when status = 'scheduled' then coalesce(m.posted_at, now()) else done_at end,
             updated_at = now()
       where id = m.delivery_id
         and nullif(btrim(post_url), '') is null;
      if found then
        v_linked := v_linked + 1;
        insert into dashboard_audit_log (user_email, action, target, old_value, new_value)
        values ('system:autolink', 'delivery_autolink', m.delivery_id::text,
                jsonb_build_object('status', m.status, 'post_url', null),
                jsonb_build_object('status', 'posted', 'post_url', m.post_url, 'post_id', m.post_id));
      end if;
    end if;

    -- Attribution, whether the link was pasted or found. Never overwrites.
    if v_platform = 'tiktok' then
      update tt_post_performance set carousel_id = m.source_id
       where account = v_handle and post_id = m.post_id and carousel_id is null;
    elsif v_platform = 'instagram' then
      update post_performance set carousel_id = m.source_id
       where account = v_handle and post_id = m.post_id and carousel_id is null;
    else
      update fb_post_performance
         set delivery_id = m.delivery_id,
             carousel_id = coalesce(carousel_id, m.source_id)
       where account = v_handle and post_id = m.post_id and delivery_id is null;
    end if;
  end loop;

  return v_linked;
end;
$$;

comment on function public.autolink_hand_posts(bigint, timestamptz) is
  'Autolink (2026-10-30): give an account''s hand-outs the link of the post its analytics robot read, by caption, one-to-one only. Returns the number linked.';


-- ─────────────────────────────────────────────────────────────────────────────
-- After a robot saves posts. Statement-level, so a batch of posts for one
-- account runs the match once. TG_ARGV[0] is the platform the table holds.
create or replace function public.autolink_after_robot_read()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a record;
begin
  -- The match's own updates to these tables land back here; nothing to do.
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  begin
    for a in
      select distinct acc.id
        from new_rows n
        join accounts acc
          on acc.username = n.account
         and lower(acc.platform) = tg_argv[0]
       where n.posted_at >= now() - interval '15 days'
         -- On an update, only a post that has lost (or never had) its content.
         and (tg_op = 'INSERT'
              or (tg_argv[0] = 'facebook' and (to_jsonb(n) ->> 'delivery_id') is null)
              or (to_jsonb(n) ->> 'carousel_id') is null)
         and exists (
           select 1 from post_deliveries d
            where d.account_id = acc.id
              and d.status in ('posted', 'scheduled')
              and d.created_at >= now() - interval '14 days'
         )
    loop
      perform autolink_hand_posts(a.id);
    end loop;
  exception
    when others then
      raise warning 'autolink after % on %: %', tg_op, tg_table_name, sqlerrm;
  end;
  return null;
end;
$$;

-- A trigger with transition tables takes one event, hence two per table.
drop trigger if exists trg_autolink_tt_insert on public.tt_post_performance;
create trigger trg_autolink_tt_insert
  after insert on public.tt_post_performance
  referencing new table as new_rows
  for each statement execute function public.autolink_after_robot_read('tiktok');
drop trigger if exists trg_autolink_tt_update on public.tt_post_performance;
create trigger trg_autolink_tt_update
  after update on public.tt_post_performance
  referencing new table as new_rows
  for each statement execute function public.autolink_after_robot_read('tiktok');

drop trigger if exists trg_autolink_ig_insert on public.post_performance;
create trigger trg_autolink_ig_insert
  after insert on public.post_performance
  referencing new table as new_rows
  for each statement execute function public.autolink_after_robot_read('instagram');
drop trigger if exists trg_autolink_ig_update on public.post_performance;
create trigger trg_autolink_ig_update
  after update on public.post_performance
  referencing new table as new_rows
  for each statement execute function public.autolink_after_robot_read('instagram');

drop trigger if exists trg_autolink_fb_insert on public.fb_post_performance;
create trigger trg_autolink_fb_insert
  after insert on public.fb_post_performance
  referencing new table as new_rows
  for each statement execute function public.autolink_after_robot_read('facebook');
drop trigger if exists trg_autolink_fb_update on public.fb_post_performance;
create trigger trg_autolink_fb_update
  after update on public.fb_post_performance
  referencing new table as new_rows
  for each statement execute function public.autolink_after_robot_read('facebook');


-- ─────────────────────────────────────────────────────────────────────────────
-- After Yurie ticks a post with no link: the robot may have read it already.
create or replace function public.autolink_after_tick()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform autolink_hand_posts(new.account_id);
  return null;
exception
  when others then
    raise warning 'autolink after tick on delivery %: %', new.id, sqlerrm;
    return null;
end;
$$;

drop trigger if exists trg_autolink_after_tick on public.post_deliveries;
create trigger trg_autolink_after_tick
  after update of status on public.post_deliveries
  for each row
  when (new.status in ('posted', 'scheduled')
        and old.status is distinct from new.status
        and nullif(btrim(new.post_url), '') is null)
  execute function public.autolink_after_tick();


-- ─────────────────────────────────────────────────────────────────────────────
-- A Facebook copy follows its Instagram twin.
create or replace function public.mirror_follows_twin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  with moved as (
    update post_deliveries m
       set status     = new.status,
           done_at    = new.done_at,
           done_by    = new.done_by,
           note       = new.note,
           -- Back on the list means no link, as Undo does by hand.
           post_url   = case when new.status = 'queued' then null else m.post_url end,
           updated_at = now()
     where m.mirror_of = new.id
       and m.status = old.status
    returning m.id
  )
  insert into dashboard_audit_log (user_email, action, target, old_value, new_value)
  select 'system:mirror', 'delivery_mirror_follow', moved.id::text,
         jsonb_build_object('status', old.status),
         jsonb_build_object('status', new.status, 'twin', new.id)
    from moved;
  return null;
end;
$$;

drop trigger if exists trg_mirror_follows_twin on public.post_deliveries;
create trigger trg_mirror_follows_twin
  after update of status on public.post_deliveries
  for each row
  when (new.mirror_of is null and old.status is distinct from new.status)
  execute function public.mirror_follows_twin();


-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.caption_match_key(text)                     from public, anon, authenticated;
revoke all on function public.hand_post_caption(text, text, text)         from public, anon, authenticated;
revoke all on function public.autolink_hand_posts(bigint, timestamptz)    from public, anon, authenticated;
revoke all on function public.autolink_after_robot_read()                 from public, anon, authenticated;
revoke all on function public.autolink_after_tick()                       from public, anon, authenticated;
revoke all on function public.mirror_follows_twin()                       from public, anon, authenticated;
grant execute on function public.autolink_hand_posts(bigint, timestamptz) to service_role;
