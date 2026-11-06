DROP POLICY IF EXISTS "requests insert self" ON public.requests;
CREATE POLICY "approved unfunded students create requests"
ON public.requests
FOR INSERT
TO authenticated
WITH CHECK (
  requester_id = auth.uid()
  AND public.has_role(auth.uid(), 'unfunded')
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.verification_status = 'approved'
      AND NOT p.suspended
  )
);

DROP POLICY IF EXISTS "messages send self" ON public.messages;
CREATE POLICY "approved request participants send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.requests r
    JOIN public.donations d ON d.id = r.donation_id
    JOIN public.profiles requester ON requester.id = r.requester_id
    WHERE r.status IN ('approved', 'collected')
      AND requester.verification_status = 'approved'
      AND NOT requester.suspended
      AND (
        (r.requester_id = auth.uid() AND d.donor_id = receiver_id)
        OR
        (d.donor_id = auth.uid() AND r.requester_id = receiver_id)
      )
  )
);