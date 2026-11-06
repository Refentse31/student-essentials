
-- donation-images: authenticated read+write, anon read for browsing
CREATE POLICY "donation images read" ON storage.objects FOR SELECT USING (bucket_id = 'donation-images');
CREATE POLICY "donation images upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'donation-images');
CREATE POLICY "donation images update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'donation-images' AND owner = auth.uid());

-- avatars
CREATE POLICY "avatars read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatars update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());

-- verification-proof: private, owner + admin only
CREATE POLICY "verification proof read own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'verification-proof' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "verification proof upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'verification-proof');
