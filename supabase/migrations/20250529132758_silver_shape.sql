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

-- Create function to check if user can read data
CREATE OR REPLACE FUNCTION public.can_read_data()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'viewer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create SELECT policies for all tables
DO $$ 
BEGIN
  -- case_type
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON case_type;
  CREATE POLICY "Enable read access for authenticated users" 
    ON case_type FOR SELECT TO authenticated 
    USING (can_read_data());

  -- units_of_units
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON units_of_units;
  CREATE POLICY "Enable read access for authenticated users" 
    ON units_of_units FOR SELECT TO authenticated 
    USING (can_read_data());

  -- product_type
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON product_type;
  CREATE POLICY "Enable read access for authenticated users" 
    ON product_type FOR SELECT TO authenticated 
    USING (can_read_data());

  -- registrant
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON registrant;
  CREATE POLICY "Enable read access for authenticated users" 
    ON registrant FOR SELECT TO authenticated 
    USING (can_read_data());

  -- warehouse
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON warehouse;
  CREATE POLICY "Enable read access for authenticated users" 
    ON warehouse FOR SELECT TO authenticated 
    USING (can_read_data());

  -- pack_size
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON pack_size;
  CREATE POLICY "Enable read access for authenticated users" 
    ON pack_size FOR SELECT TO authenticated 
    USING (can_read_data());

  -- product
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON product;
  CREATE POLICY "Enable read access for authenticated users" 
    ON product FOR SELECT TO authenticated 
    USING (can_read_data());

  -- item
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON item;
  CREATE POLICY "Enable read access for authenticated users" 
    ON item FOR SELECT TO authenticated 
    USING (can_read_data());

  -- transaction_header
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transaction_header;
  CREATE POLICY "Enable read access for authenticated users" 
    ON transaction_header FOR SELECT TO authenticated 
    USING (can_read_data());

  -- transaction_detail
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transaction_detail;
  CREATE POLICY "Enable read access for authenticated users" 
    ON transaction_detail FOR SELECT TO authenticated 
    USING (can_read_data());
END $$;