/*
  # Update role-based access control

  1. Security Changes
    - Add is_admin() function to check user role
    - Update existing policies to use is_admin() function
    - Add Name column to profiles table
    
  2. Changes
    - Modify existing policies to use is_admin() check
    - Add Name column to profiles table
*/

-- Add Name column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'Name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN "Name" text;
  END IF;
END $$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing policies to only allow admins to modify data
DO $$ 
BEGIN
  -- case_type
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for case_type') THEN
    ALTER POLICY "Allow edit access to specific users for case_type" ON case_type
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- units_of_units
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for units_of_units') THEN
    ALTER POLICY "Allow edit access to specific users for units_of_units" ON units_of_units
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- product_type
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for product_type') THEN
    ALTER POLICY "Allow edit access to specific users for product_type" ON product_type
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- registrant
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for registrant') THEN
    ALTER POLICY "Allow edit access to specific users for registrant" ON registrant
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- warehouse
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for warehouse') THEN
    ALTER POLICY "Allow edit access to specific users for warehouse" ON warehouse
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- pack_size
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for pack_size') THEN
    ALTER POLICY "Allow edit access to specific users for pack_size" ON pack_size
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- product
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for product') THEN
    ALTER POLICY "Allow edit access to specific users for product" ON product
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- item
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for item') THEN
    ALTER POLICY "Allow edit access to specific users for item" ON item
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- transaction_header
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for transaction_header') THEN
    ALTER POLICY "Allow edit access to specific users for transaction_header" ON transaction_header
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- transaction_detail
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow edit access to specific users for transaction_detail') THEN
    ALTER POLICY "Allow edit access to specific users for transaction_detail" ON transaction_detail
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;