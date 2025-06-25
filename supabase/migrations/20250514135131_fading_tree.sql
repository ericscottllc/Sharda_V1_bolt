/*
  # Add profiles table and role-based access control

  1. New Tables
    - profiles
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - role (text, either 'admin' or 'viewer')
      - created_at (timestamp with time zone)

  2. Security
    - Enable RLS on profiles table
    - Add policies for authenticated users
    - Update existing policies to check user role
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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
ALTER POLICY "Allow edit access to specific users for case_type" ON case_type
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER POLICY "Allow edit access to specific users for units_of_units" ON units_of_units
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER POLICY "Allow edit access to specific users for product_type" ON product_type
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER POLICY "Allow edit access to specific users for registrant" ON registrant
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER POLICY "Allow edit access to specific users for warehouse" ON warehouse
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER POLICY "Allow edit access to specific users for pack_size" ON pack_size
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER POLICY "Allow edit access to specific users for product" ON product
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER POLICY "Allow edit access to specific users for item" ON item
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER POLICY "Allow edit access to specific users for transaction_header" ON transaction_header
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER POLICY "Allow edit access to specific users for transaction_detail" ON transaction_detail
  USING (is_admin())
  WITH CHECK (is_admin());