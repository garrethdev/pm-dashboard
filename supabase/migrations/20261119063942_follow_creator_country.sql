-- Creators to follow: her country (Garreth, 2026-11-19: our ICP is US women
-- aged 40 to 50 in health and wellness; "most importantly lives in the US").
--
-- country  the country TikTok places her account in ("US", "GB"…), from
--          ScrapeCreators' /v1/tiktok/profile/region. An Instagram creator
--          takes her TikTok twin's, since Instagram gives none. The monthly
--          top-up only adds "US". Null on rows never looked up.
alter table public.follow_creators
  add column if not exists country text;

comment on column public.follow_creators.country is
  'Country TikTok places her account in (ISO code, e.g. US). Instagram rows take their TikTok twin''s. Top-up adds US only (2026-11-19).';
