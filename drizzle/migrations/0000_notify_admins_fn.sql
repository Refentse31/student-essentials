CREATE OR REPLACE FUNCTION public.notify_admins(_type public.notification_type, _title text, _body text DEFAULT NULL, _link text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT ur.user_id, _type, left(_title, 200), left(_body, 1000), _link
  FROM public.user_roles ur WHERE ur.role = 'admin' AND ur.user_id <> auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.notify_admins(public.notification_type, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_admins(public.notification_type, text, text, text) TO authenticated;