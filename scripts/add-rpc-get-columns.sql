-- Create a function to get column names for a table
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS text[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT column_name::text
        FROM information_schema.columns
        WHERE table_name = $1
        AND table_schema = 'public'
        ORDER BY ordinal_position
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_table_columns TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_columns TO service_role;

-- Comment on function
COMMENT ON FUNCTION get_table_columns IS 'Returns an array of column names for the specified table';
