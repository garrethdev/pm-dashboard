-- The Women's Complaints render agent reads its pictures fresh on every run from this view (the public key cannot read
-- jealousy_image_pool). Only active rows under rich-life-images/character-6/ whose file still exists in storage, with the
-- tags the picture rules use (Garreth, 2026-11-25): slides 2-6 nature OR (before AND old), slides 7-8 (after AND old).
create or replace view public.v_character6_picture_pool as
select j.storage_path, j.url, j.stage, j.age_group, j.her_in_photo, j.body_shown,
       coalesce(c.content, j.notes, '') as what
from public.jealousy_image_pool j
join storage.objects o on o.bucket_id = 'rich-life-images' and o.name = j.storage_path
left join lateral (select content from public.carousel_images ci where ci.image_url = j.url limit 1) c on true
where j.active and j.storage_path like 'character-6/%';
grant select on public.v_character6_picture_pool to anon, authenticated, service_role;