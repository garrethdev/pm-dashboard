alter table public.issue_accounts add column if not exists display_name text;

comment on column public.issue_accounts.display_name is
  'Facebook only: the account''s name (accounts.display_name) at report time. A Facebook username is often a page number.';

create or replace view public.v_reports with (security_invoker = true) as
select
  i.id,
  i.kind,
  i.reported_at,
  i.reported_by,
  i.category,
  i.description,
  i.status,
  i.status_changed_at,
  i.page_path,
  i.screenshot_path,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'profile', a.geelark_profile,
        'username', a.username,
        'display_name', a.display_name,
        'platform', a.platform,
        'post_id', a.post_id,
        'post_url', a.post_url,
        'posted_at', a.posted_at
      )
      order by a.id
    ) filter (where a.id is not null),
    '[]'::jsonb
  ) as accounts
from public.issues i
left join public.issue_accounts a on a.issue_id = i.id
group by i.id;

revoke all on public.v_reports from public, anon, authenticated;
grant select on public.v_reports to service_role;
