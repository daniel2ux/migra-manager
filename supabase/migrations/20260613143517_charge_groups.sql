-- Grupos de objetos (grupos de carga: G1, G2, G3…)

CREATE TABLE public.charge_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  object_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_charge_groups_name_upper ON public.charge_groups (upper(trim(name)));

ALTER TABLE public.charge_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY charge_groups_select ON public.charge_groups
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY charge_groups_write ON public.charge_groups
  FOR ALL TO authenticated
  USING (private.is_admin_or_master())
  WITH CHECK (private.is_admin_or_master());
