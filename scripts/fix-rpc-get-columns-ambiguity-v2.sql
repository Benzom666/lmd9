CREATE OR REPLACE FUNCTION get_table_columns(
  table_name TEXT, -- Parameter name matching the RPC call
  schema_name TEXT DEFAULT 'public' -- Optional schema name parameter
)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT
      isc.column_name::TEXT
    FROM
      information_schema.columns AS isc -- Use an alias for information_schema.columns
    WHERE
      isc.table_name = get_table_columns.table_name  -- Qualify the function parameter
      AND isc.table_schema = get_table_columns.schema_name -- Qualify the function parameter
    ORDER BY
      isc.ordinal_position
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Example of how to call it (for testing in SQL editor):
-- SELECT * FROM get_table_columns('orders', 'public');
-- SELECT * FROM get_table_columns(table_name := 'user_profiles'); -- using named parameter
