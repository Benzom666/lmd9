-- Drop the function get_table_columns that takes only one TEXT argument.
-- This is to resolve ambiguity with get_table_columns(TEXT, TEXT DEFAULT 'public').
DROP FUNCTION IF EXISTS public.get_table_columns(TEXT);

-- Verify that the intended function still exists (optional check)
-- This should be the function created by 'fix-rpc-get-columns-ambiguity-v2.sql'
COMMENT ON FUNCTION public.get_table_columns(TEXT, TEXT) IS 'Returns an array of column names for the specified table in the specified schema (defaults to public). Resolves parameter ambiguity.';
