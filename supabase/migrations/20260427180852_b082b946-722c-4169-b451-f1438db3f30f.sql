-- 1) Fix organization_members UPDATE: prevent privilege escalation to owner by non-owners
DROP POLICY IF EXISTS "Owners/admins update roles" ON public.organization_members;
CREATE POLICY "Owners/admins update roles"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]))
WITH CHECK (
  public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[])
  AND (
    role <> 'owner'::public.app_role
    OR public.has_org_role(auth.uid(), org_id, ARRAY['owner']::public.app_role[])
  )
);

-- 2) Restrict profiles SELECT to self + org-mates
DROP POLICY IF EXISTS "Profiles viewable by signed in" ON public.profiles;
CREATE POLICY "Profiles viewable by org-mates"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = auth.uid()
      AND om2.user_id = profiles.user_id
  )
);

-- 3) app_config: lock to service-role only (no anon/authenticated access).
--    Add explicit deny-all policies so RLS is intentionally restrictive.
CREATE POLICY "No client read of app_config"
ON public.app_config
FOR SELECT
TO authenticated
USING (false);

CREATE POLICY "No client write of app_config"
ON public.app_config
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 4) Lock down SECURITY DEFINER helpers: revoke from anon/public, grant to authenticated only where needed
REVOKE ALL ON FUNCTION public.has_org_role(uuid, uuid, public.app_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_task_assignee(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_owner_membership() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_organization(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_org_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lookup_invite(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_org_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_invite(text) TO authenticated;

-- 5) Seed a dedicated internal-function shared secret (separate from service role key)
INSERT INTO public.app_config(key, value)
VALUES ('internal_function_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;