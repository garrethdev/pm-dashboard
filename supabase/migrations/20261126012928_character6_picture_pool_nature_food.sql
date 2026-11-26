-- Garreth, 2026-11-25: "remove as many images of her in the middle slides and tell the renderer to balance out more just
-- nature or food shots". The nature-basis and food-basis folders (15 each, added 2026-11-24, no person) have no
-- jealousy_image_pool row, so the renderer could not see them. The view now also lists every file still in those two
-- folders, and every row carries its folder so the renderer can tell nature and food apart.
create or replace view public.v_character6_picture_pool as
select j.storage_path, j.url, j.stage, j.age_group, j.her_in_photo, j.body_shown,
       coalesce(c.content, j.notes, '') as what,
       split_part(j.storage_path, '/', 2) as folder
from public.jealousy_image_pool j
join storage.objects o on o.bucket_id = 'rich-life-images' and o.name = j.storage_path
left join lateral (select content from public.carousel_images ci where ci.image_url = j.url limit 1) c on true
where j.active and j.storage_path like 'character-6/%'
union all
select o.name, 'https://qlcmgxgwpzmiebzxflai.supabase.co/storage/v1/object/public/rich-life-images/' || o.name,
       null, null, false, false,
       case when o.name like 'character-6/nature-basis/%' then 'nature scenery, no person' else 'food, no person' end,
       split_part(o.name, '/', 2)
from storage.objects o
where o.bucket_id = 'rich-life-images'
  and (o.name like 'character-6/nature-basis/%' or o.name like 'character-6/food-basis/%')
  and o.name ~* '\.(jpg|jpeg|png|webp)$'
  and not exists (select 1 from public.jealousy_image_pool j where j.storage_path = o.name);
grant select on public.v_character6_picture_pool to anon, authenticated, service_role;