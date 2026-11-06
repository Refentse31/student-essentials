
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'donor', 'unfunded');
CREATE TYPE public.donation_category AS ENUM ('books','food','clothing','shoes','stationery','toiletries','bedding','electronics','kitchen','other');
CREATE TYPE public.item_condition AS ENUM ('new','like_new','good','fair');
CREATE TYPE public.donation_status AS ENUM ('pending','approved','rejected','reserved','collected');
CREATE TYPE public.request_status AS ENUM ('pending','approved','rejected','collected','cancelled');
CREATE TYPE public.verification_status AS ENUM ('none','pending','approved','rejected');
CREATE TYPE public.notification_type AS ENUM ('welcome','verification_approved','verification_rejected','donation_approved','donation_rejected','item_requested','request_approved','request_rejected','new_donation','item_collected','message_received','priority_review');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_number TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  faculty TEXT,
  avatar_url TEXT,
  verification_status public.verification_status NOT NULL DEFAULT 'none',
  suspended BOOLEAN NOT NULL DEFAULT false,
  notification_pref BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- VERIFICATIONS
CREATE TABLE public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_number TEXT NOT NULL,
  proof_url TEXT,
  motivation TEXT NOT NULL,
  financial_status TEXT NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.verifications TO authenticated;
GRANT ALL ON public.verifications TO service_role;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- DONATIONS
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category public.donation_category NOT NULL,
  description TEXT,
  condition public.item_condition NOT NULL,
  image_url TEXT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  pickup_location TEXT NOT NULL DEFAULT 'Campus Library',
  status public.donation_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.donations TO anon;
GRANT SELECT, INSERT, UPDATE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Force pickup location to Campus Library always
CREATE OR REPLACE FUNCTION public.force_campus_library()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.pickup_location := 'Campus Library';
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_force_pickup BEFORE INSERT OR UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.force_campus_library();

-- REQUESTS
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  donation_id UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  is_priority BOOLEAN NOT NULL DEFAULT false,
  priority_reason TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_requests_requester ON public.requests(requester_id, created_at);
CREATE UNIQUE INDEX idx_unique_active_request ON public.requests(requester_id, donation_id) WHERE status IN ('pending','approved');
GRANT SELECT, INSERT, UPDATE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Enforce monthly limit (3) + verification + availability
CREATE OR REPLACE FUNCTION public.validate_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.verification_status;
  v_count INT;
  v_donation_status public.donation_status;
BEGIN
  SELECT verification_status INTO v_status FROM public.profiles WHERE id = NEW.requester_id;
  IF v_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Only verified students can request items.';
  END IF;

  SELECT status INTO v_donation_status FROM public.donations WHERE id = NEW.donation_id;
  IF v_donation_status <> 'approved' THEN
    RAISE EXCEPTION 'This item is not available.';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.requests
    WHERE requester_id = NEW.requester_id
      AND created_at >= date_trunc('month', now())
      AND status <> 'cancelled';
  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Monthly request limit reached.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_request BEFORE INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.validate_request();

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_pair ON public.messages(sender_id, receiver_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RATINGS
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, rater_id)
);
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- profiles
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- verifications
CREATE POLICY "verifications owner read" ON public.verifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "verifications insert self" ON public.verifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "verifications admin update" ON public.verifications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- donations
CREATE POLICY "donations public approved" ON public.donations FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "donations auth read" ON public.donations FOR SELECT TO authenticated USING (true);
CREATE POLICY "donations insert self" ON public.donations FOR INSERT TO authenticated WITH CHECK (donor_id = auth.uid());
CREATE POLICY "donations donor update own pending" ON public.donations FOR UPDATE TO authenticated USING (donor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- requests
CREATE POLICY "requests read involved" ON public.requests FOR SELECT TO authenticated USING (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.donations d WHERE d.id = donation_id AND d.donor_id = auth.uid()));
CREATE POLICY "requests insert self" ON public.requests FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "requests update admin or self cancel" ON public.requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR requester_id = auth.uid());

-- messages
CREATE POLICY "messages read involved" ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "messages send self" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages update receiver" ON public.messages FOR UPDATE TO authenticated USING (receiver_id = auth.uid());
CREATE POLICY "messages delete involved" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- notifications
CREATE POLICY "notifications self read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications self update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications self delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications insert auth" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ratings
CREATE POLICY "ratings read all" ON public.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ratings insert self" ON public.ratings FOR INSERT TO authenticated WITH CHECK (rater_id = auth.uid());

-- ============ HANDLE NEW USER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_admin_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, student_number, phone, faculty)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'student_number',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'faculty'
  );

  -- role assignment: first user becomes admin, else from meta (default donor)
  SELECT COUNT(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';
  IF v_admin_count = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'donor');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (NEW.id, 'welcome', 'Welcome to Student Essentials!', 'Thanks for joining. Start browsing or upload your first donation.');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_donations BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- sync verification status to profile
CREATE OR REPLACE FUNCTION public.sync_verification_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET verification_status = NEW.status WHERE id = NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_verification AFTER INSERT OR UPDATE ON public.verifications
FOR EACH ROW EXECUTE FUNCTION public.sync_verification_status();
