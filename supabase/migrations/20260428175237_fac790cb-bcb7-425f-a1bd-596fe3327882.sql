REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_view_as_org(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_platform_admin(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_create_organization(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_update_organization(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_set_org_suspended(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_delete_organization(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_metrics() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_list_organizations() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_list_users() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_view_as_org(uuid) TO authenticated;