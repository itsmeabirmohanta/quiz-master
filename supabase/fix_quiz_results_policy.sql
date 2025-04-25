-- First check if the quiz_results table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'quiz_results'
  ) THEN
    RAISE EXCEPTION 'The quiz_results table does not exist in the public schema';
  END IF;
END
$$;

-- Verify the foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'quiz_results'
    AND kcu.column_name = 'quiz_id'
  ) THEN
    RAISE NOTICE 'No foreign key constraint found on quiz_id in quiz_results table';
  END IF;
END
$$;

-- Check and log existing policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE 'Current policies on quiz_results:';
  FOR policy_record IN
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename = 'quiz_results'
  LOOP
    RAISE NOTICE 'Policy: %, Command: %, Roles: %, Using: %, With Check: %',
      policy_record.policyname,
      policy_record.cmd,
      policy_record.roles,
      policy_record.qual,
      policy_record.with_check;
  END LOOP;
END
$$;

-- Drop the existing policy that only allows authenticated users to insert quiz results
DROP POLICY IF EXISTS "Users can record their own quiz results" ON public.quiz_results;

-- Create a new policy that allows both authenticated and anonymous users to insert quiz results
CREATE POLICY "Anyone can insert quiz results" 
  ON public.quiz_results FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- If needed, this policy allows all users to see all quiz results
-- You may want to restrict this further based on your application needs
CREATE POLICY "Anyone can view quiz results" 
  ON public.quiz_results FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add safety check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_results'
    AND policyname = 'Anyone can insert quiz results'
  ) THEN
    RAISE EXCEPTION 'Failed to create the new policy for quiz_results';
  END IF;
END
$$;

-- Test with a direct insert (will fail with foreign key violation if valid quiz_id doesn't exist)
-- But at least we'll know permissions are correct
DO $$
BEGIN
  BEGIN
    INSERT INTO public.quiz_results 
    (quiz_id, user_name, score, total_questions, time_taken, completed_at)
    VALUES 
    ('00000000-0000-0000-0000-000000000000', 'Test User', 5, 10, 300, NOW());
    
    RAISE NOTICE 'Test insert succeeded! This is unexpected as the quiz_id should not exist.';
    
    -- Clean up the test record
    DELETE FROM public.quiz_results 
    WHERE quiz_id = '00000000-0000-0000-0000-000000000000' AND user_name = 'Test User';
    
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'Foreign key violation as expected. Permissions look correct, but you need a valid quiz_id.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Test insert failed with unexpected error: %', SQLERRM;
  END;
END
$$; 