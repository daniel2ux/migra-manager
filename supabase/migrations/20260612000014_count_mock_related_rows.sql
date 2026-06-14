-- Contagens agregadas por mock para o utilitário purge-inactive-mocks (GROUP BY no Postgres).

CREATE OR REPLACE FUNCTION public.count_mock_related_rows(
  p_project_id UUID,
  p_mock_ids UUID[]
)
RETURNS TABLE (
  mock_id UUID,
  object_count BIGINT,
  log_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mock_ids AS (
    SELECT unnest(p_mock_ids) AS id
  ),
  object_counts AS (
    SELECT
      mo.mock_id,
      COUNT(*)::bigint AS cnt
    FROM public.migration_objects mo
    WHERE mo.project_id = p_project_id
      AND mo.mock_id = ANY (p_mock_ids)
    GROUP BY mo.mock_id
  ),
  log_counts AS (
    SELECT
      ml.mock,
      COUNT(*)::bigint AS cnt
    FROM public.migration_logs ml
    WHERE ml.project_id = p_project_id
      AND ml.mock = ANY (
        SELECT m.id::text
        FROM mock_ids m
      )
    GROUP BY ml.mock
  )
  SELECT
    m.id AS mock_id,
    COALESCE(oc.cnt, 0) AS object_count,
    COALESCE(lc.cnt, 0) AS log_count
  FROM mock_ids m
  LEFT JOIN object_counts oc ON oc.mock_id = m.id
  LEFT JOIN log_counts lc ON lc.mock = m.id::text;
$$;

REVOKE ALL ON FUNCTION public.count_mock_related_rows(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_mock_related_rows(UUID, UUID[]) TO service_role;
