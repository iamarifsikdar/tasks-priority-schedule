CREATE OR REPLACE FUNCTION public.create_organization(_name text, _slug text)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org public.organizations;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _name IS NULL OR length(btrim(_name)) = 0 THEN
    RAISE EXCEPTION 'Name required';
  END IF;
  INSERT INTO public.organizations(name, slug, owner_id)
  VALUES (btrim(_name), COALESCE(NULLIF(btrim(_slug), ''), encode(gen_random_bytes(6), 'hex')), v_user)
  RETURNING * INTO v_org;
  -- owner membership is added by trg_org_add_owner trigger
  RETURN v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;