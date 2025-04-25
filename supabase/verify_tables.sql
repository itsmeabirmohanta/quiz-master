-- Check if quiz_results table exists
SELECT EXISTS (
   SELECT FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename = 'quiz_results'
);

-- Get the structure of the quiz_results table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'quiz_results';

-- Check policies on quiz_results table
SELECT
    p.policyname,
    p.cmd AS operation,
    p.permissive,
    p.roles,
    p.qual AS using_expression,
    p.with_check
FROM pg_policies p
JOIN pg_class c ON p.tableid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'quiz_results';

-- Check if there are any foreign key constraints causing issues
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY'
AND tc.table_name='quiz_results';

-- Test inserting a sample record directly (this will help identify permission issues)
DO $$
BEGIN
    BEGIN
        INSERT INTO public.quiz_results 
        (quiz_id, user_name, score, total_questions, time_taken, completed_at)
        VALUES 
        ('00000000-0000-0000-0000-000000000000', 'Test User', 5, 10, 300, NOW());
        
        RAISE NOTICE 'Test insert succeeded';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
    END;
END $$; 