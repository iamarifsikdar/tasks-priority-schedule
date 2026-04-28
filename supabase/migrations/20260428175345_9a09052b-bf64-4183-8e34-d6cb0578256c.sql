-- Encrypt a TOTP secret using the key in app_config and store it on the platform_admins row.
-- Caller must be the admin themselves OR service role; we verify caller is the same user.
CREATE OR REPLACE FUNCTION public.platform_admin_set_totp(_secret_b32 text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_key text; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_platform_admin(v_uid) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT value INTO v_key FROM public.app_config WHERE key = 'platform_admin_totp_key';
  IF v_key IS NULL THEN RAISE EXCEPTION 'Encryption key missing'; END IF;
  UPDATE public.platform_admins
    SET totp_secret_encrypted = extensions.pgp_sym_encrypt(_secret_b32, v_key),
        totp_enrolled_at = now(),
        updated_at = now()
    WHERE user_id = v_uid;
END;
$$;

-- Returns the caller's own decrypted TOTP secret (base32).
CREATE OR REPLACE FUNCTION public.platform_admin_get_totp()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_key text; v_uid uuid := auth.uid(); v_enc bytea;
BEGIN
  IF v_uid IS NULL OR NOT public.is_platform_admin(v_uid) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT value INTO v_key FROM public.app_config WHERE key = 'platform_admin_totp_key';
  SELECT totp_secret_encrypted INTO v_enc FROM public.platform_admins WHERE user_id = v_uid;
  IF v_enc IS NULL THEN RETURN NULL; END IF;
  RETURN extensions.pgp_sym_decrypt(v_enc, v_key);
END;
$$;

-- Whether the caller has TOTP enrolled.
CREATE OR REPLACE FUNCTION public.platform_admin_status()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_enrolled boolean := false; v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('is_admin', false); END IF;
  SELECT (totp_secret_encrypted IS NOT NULL), email
    INTO v_enrolled, v_email
    FROM public.platform_admins WHERE user_id = v_uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('is_admin', false); END IF;
  RETURN jsonb_build_object('is_admin', true, 'totp_enrolled', v_enrolled, 'email', v_email);
END;
$$;

-- Create a verified 2FA session row (caller must already have proven TOTP via edge function).
-- For safety this RPC is only callable through the server-side flow; we keep it accessible
-- to authenticated users but require the caller to be a platform admin.
CREATE OR REPLACE FUNCTION public.platform_admin_create_session(_token text, _hours int DEFAULT 8)
RETURNS public.platform_admin_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.platform_admin_sessions;
BEGIN
  IF v_uid IS NULL OR NOT public.is_platform_admin(v_uid) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.platform_admin_sessions(user_id, session_token, expires_at)
  VALUES (v_uid, _token, now() + make_interval(hours => GREATEST(1, LEAST(24, _hours))))
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_end_session()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  UPDATE public.platform_admin_sessions
    SET ended_at = now(), view_as_org_id = NULL
    WHERE user_id = v_uid AND ended_at IS NULL;
END;
$$;

-- Begin / end view-as for an organization. Logs to impersonation_logs.
CREATE OR REPLACE FUNCTION public.platform_admin_view_as(_org_id uuid, _reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_org_name text;
BEGIN
  IF v_uid IS NULL OR NOT public.is_platform_admin(v_uid) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT email INTO v_email FROM public.platform_admins WHERE user_id = v_uid;
  SELECT name INTO v_org_name FROM public.organizations WHERE id = _org_id;
  IF v_org_name IS NULL THEN RAISE EXCEPTION 'Organization not found'; END IF;
  -- Set the most recent active session's view_as
  UPDATE public.platform_admin_sessions
    SET view_as_org_id = _org_id
    WHERE id = (
      SELECT id FROM public.platform_admin_sessions
      WHERE user_id = v_uid AND ended_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC LIMIT 1
    );
  IF NOT FOUND THEN RAISE EXCEPTION 'No active super-admin session'; END IF;
  INSERT INTO public.impersonation_logs(admin_user_id, admin_email, target_org_id, target_org_name, action, reason)
  VALUES (v_uid, v_email, _org_id, v_org_name, 'start', _reason);
  RETURN _org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_stop_view_as()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_org_id uuid; v_org_name text;
BEGIN
  IF v_uid IS NULL OR NOT public.is_platform_admin(v_uid) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT view_as_org_id INTO v_org_id FROM public.platform_admin_sessions
    WHERE user_id = v_uid AND ended_at IS NULL AND view_as_org_id IS NOT NULL
    ORDER BY created_at DESC LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;
  SELECT email INTO v_email FROM public.platform_admins WHERE user_id = v_uid;
  SELECT name INTO v_org_name FROM public.organizations WHERE id = v_org_id;
  UPDATE public.platform_admin_sessions
    SET view_as_org_id = NULL
    WHERE user_id = v_uid AND ended_at IS NULL;
  INSERT INTO public.impersonation_logs(admin_user_id, admin_email, target_org_id, target_org_name, action)
  VALUES (v_uid, v_email, v_org_id, v_org_name, 'end');
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_admin_list_logs(_limit int DEFAULT 100)
RETURNS SETOF public.impersonation_logs
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.impersonation_logs ORDER BY created_at DESC LIMIT GREATEST(1, LEAST(500, _limit));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.platform_admin_set_totp(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_admin_get_totp() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_admin_status() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_admin_create_session(text, int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_admin_end_session() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_admin_view_as(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_admin_stop_view_as() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_admin_list_logs(int) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.platform_admin_set_totp(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_get_totp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_create_session(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_end_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_view_as(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_stop_view_as() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_admin_list_logs(int) TO authenticated;