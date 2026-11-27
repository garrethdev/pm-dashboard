-- Robot updates, part 2 (2026-11-27): fill in robot_version for the reports
-- already there, the last 3 days only. Run on its own: a first try that also
-- went through all 30 days of logs (up to a megabyte each) in one statement
-- failed in the SQL editor with "Unable to reach the server" while the
-- database was short of memory. The newest report is all the Robot updates
-- page reads; every new report is filled in by the trigger in part 1.
update public.warmup_reports
   set robot_version = (regexp_match(left(log, 4000), '"version":"([^"]+)"'))[1]
 where robot_version is null
   and log is not null
   and started_at > now() - interval '3 days';
