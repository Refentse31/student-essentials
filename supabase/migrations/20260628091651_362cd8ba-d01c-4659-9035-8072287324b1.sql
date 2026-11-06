
ALTER TABLE public.donations ADD CONSTRAINT donations_donor_profile_fk FOREIGN KEY (donor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.requests ADD CONSTRAINT requests_requester_profile_fk FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.verifications ADD CONSTRAINT verifications_user_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
