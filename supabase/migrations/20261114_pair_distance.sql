-- Расстояние между двумя людьми пары: только по согласию обоих и только округлённое.
-- Выполнять в Supabase -> SQL Editor. Скрипт можно запускать повторно.
-- Требует pair_links из 20261111_pair_together.sql.
--
-- pair_geo: свои приблизительные координаты (приложение округляет их до 0,1 градуса, это около 11 км).
-- Строку видит и меняет только её владелец, партнёр до неё добраться не может.
-- Наличие строки и есть согласие делиться; выключение удаляет строку.
-- Расстояние считает функция pair_distance_km и отдаёт только километры, округлённые до 5,
-- и только когда у обоих есть свежая (до 7 дней) отметка.

CREATE TABLE IF NOT EXISTS public.pair_geo (
  link_id UUID NOT NULL REFERENCES public.pair_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat NUMERIC(5,1) NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon NUMERIC(4,1) NOT NULL CHECK (lon BETWEEN -180 AND 180),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, user_id)
);
-- NUMERIC(4,1) вмещает до +-999,9, поэтому диапазон долготы держит CHECK выше
ALTER TABLE public.pair_geo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pair_geo FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pair_geo TO authenticated;

DROP POLICY IF EXISTS "pair geo read own" ON public.pair_geo;
CREATE POLICY "pair geo read own" ON public.pair_geo
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pair geo add" ON public.pair_geo;
CREATE POLICY "pair geo add" ON public.pair_geo
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair geo update own" ON public.pair_geo;
CREATE POLICY "pair geo update own" ON public.pair_geo
FOR UPDATE TO authenticated USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.pair_links l WHERE l.id = link_id));

DROP POLICY IF EXISTS "pair geo delete own" ON public.pair_geo;
CREATE POLICY "pair geo delete own" ON public.pair_geo
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- km: расстояние, округлённое до 5 км (NULL, пока не делятся оба); other_on: делится ли партнёр
CREATE OR REPLACE FUNCTION public.pair_distance_km(p_link UUID)
RETURNS TABLE (km INTEGER, other_on BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH member AS (
    SELECT 1 FROM public.pair_links l WHERE l.id = p_link AND auth.uid() IN (l.user_a, l.user_b)
  ),
  me AS (
    SELECT g.lat, g.lon FROM public.pair_geo g
    WHERE g.link_id = p_link AND g.user_id = auth.uid() AND g.updated_at > now() - interval '7 days'
  ),
  ot AS (
    SELECT g.lat, g.lon FROM public.pair_geo g
    WHERE g.link_id = p_link AND g.user_id <> auth.uid() AND g.updated_at > now() - interval '7 days'
  )
  SELECT
    CASE WHEN me.lat IS NOT NULL AND ot.lat IS NOT NULL THEN
      (round(
        2 * 6371 * asin(sqrt(least(1,
          power(sin(radians(ot.lat - me.lat) / 2), 2)
          + cos(radians(me.lat)) * cos(radians(ot.lat)) * power(sin(radians(ot.lon - me.lon) / 2), 2)
        ))) / 5
      ) * 5)::INTEGER
    END,
    ot.lat IS NOT NULL
  FROM (SELECT 1) x
  JOIN member ON true
  LEFT JOIN me ON true
  LEFT JOIN ot ON true;
$$;
REVOKE ALL ON FUNCTION public.pair_distance_km(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pair_distance_km(UUID) TO authenticated;

-- Проверка (должна вернуть строку с km NULL или числом):
-- SELECT * FROM public.pair_distance_km('<id вашей пары из pair_links>');
