/*
  # Add execute_sql function for dynamic queries

  1. New Functions
    - `execute_sql(query_text text)`: A function that allows executing dynamic SQL queries
      - Takes a text parameter containing the SQL query
      - Returns a set of records based on the query results
      - Uses SECURITY DEFINER to run with elevated privileges
      - Restricted to authenticated users only

  2. Security
    - Function is marked as SECURITY DEFINER to execute with owner privileges
    - Access is restricted to authenticated users through GRANT
    - Input validation ensures only SELECT queries are allowed
*/

-- Create the execute_sql function
CREATE OR REPLACE FUNCTION public.execute_sql(query_text text)
RETURNS SETOF record
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result record;
BEGIN
  -- Validate that the query is a SELECT statement
  IF NOT (lower(trim(query_text)) LIKE 'select%' OR 
          lower(trim(query_text)) LIKE 'with%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Execute the query and return results
  FOR result IN EXECUTE query_text
  LOOP
    RETURN NEXT result;
  END LOOP;
  
  RETURN;
END;
$$;

-- Set proper search path
ALTER FUNCTION public.execute_sql(text) SET search_path = public;

-- Revoke access from public and grant to authenticated users only
REVOKE ALL ON FUNCTION public.execute_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;