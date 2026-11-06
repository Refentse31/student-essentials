CREATE TABLE public.recovery_phrases (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, UPDATE ON public.recovery_phrases TO authenticated;
GRANT ALL ON public.recovery_phrases TO service_role;

ALTER TABLE public.recovery_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recovery insert self" ON public.recovery_phrases
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "recovery update self" ON public.recovery_phrases
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_touch_recovery BEFORE UPDATE ON public.recovery_phrases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();