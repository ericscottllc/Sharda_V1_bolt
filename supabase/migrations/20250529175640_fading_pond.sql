-- Fix function search paths for all public functions

-- can_read_data
CREATE OR REPLACE FUNCTION public.can_read_data()
RETURNS boolean AS $$
BEGIN
  SET search_path = public;
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'viewer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- execute_sql
CREATE OR REPLACE FUNCTION public.execute_sql(query_text text)
RETURNS SETOF record AS $$
DECLARE
  result record;
BEGIN
  SET search_path = public;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_user_name
CREATE OR REPLACE FUNCTION public.get_user_name(user_id uuid)
RETURNS text AS $$
BEGIN
  SET search_path = public;
  RETURN (
    SELECT "Name"
    FROM public.profiles
    WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- has_edit_access
CREATE OR REPLACE FUNCTION public.has_edit_access()
RETURNS boolean AS $$
BEGIN
  SET search_path = public;
  RETURN auth.uid() IN (
    '7dfe7cd1-1b7b-4a35-94a5-ee580d24a25e'::uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  SET search_path = public;
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- log_user_action
CREATE OR REPLACE FUNCTION public.log_user_action()
RETURNS trigger AS $$
BEGIN
  SET search_path = public;
  -- Add any logging logic here
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- set_session_user_name
CREATE OR REPLACE FUNCTION public.set_session_user_name()
RETURNS trigger AS $$
BEGIN
  SET search_path = public;
  NEW.user_name := (
    SELECT "Name"
    FROM public.profiles
    WHERE user_id = NEW.user_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- should_log_user
CREATE OR REPLACE FUNCTION public.should_log_user(user_id uuid)
RETURNS boolean AS $$
BEGIN
  SET search_path = public;
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.excluded_users
    WHERE excluded_users.user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;