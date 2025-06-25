/*
  # Add analytics tables for user tracking

  1. New Tables
    - user_sessions
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - started_at (timestamptz)
      - ended_at (timestamptz)
      - ip_address (text)
      - user_agent (text)
      - device_type (text)
      - location (text)
      
    - user_actions
      - id (uuid, primary key)
      - session_id (uuid, references user_sessions)
      - action_type (text)
      - action_details (jsonb)
      - performed_at (timestamptz)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for admins to view all data
    - Add policies for users to view their own data
*/

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  ip_address text,
  user_agent text,
  device_type text,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Create user_actions table
CREATE TABLE IF NOT EXISTS public.user_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.user_sessions NOT NULL,
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}'::jsonb,
  performed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

-- Policies for user_sessions
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Policies for user_actions
CREATE POLICY "Users can view own actions"
  ON public.user_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_sessions
      WHERE user_sessions.id = user_actions.session_id
      AND user_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all actions"
  ON public.user_actions
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_actions_session_id ON public.user_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_action_type ON public.user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_actions_performed_at ON public.user_actions(performed_at);