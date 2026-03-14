-- Allow users to update their own read records (for sign-off)
CREATE POLICY "Users can update own reads"
  ON public.sop_reads FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
