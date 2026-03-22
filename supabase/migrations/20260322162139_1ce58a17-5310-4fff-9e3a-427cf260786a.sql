
-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  plan TEXT NOT NULL DEFAULT 'trial',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create validations table
CREATE TABLE public.validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_data JSONB NOT NULL,
  results JSONB NOT NULL,
  overall_status TEXT NOT NULL,
  errors_found INTEGER NOT NULL DEFAULT 0,
  warnings_found INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.validations ENABLE ROW LEVEL SECURITY;

-- Users can read their own validations
CREATE POLICY "Users can read own validations"
  ON public.validations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own validations
CREATE POLICY "Users can insert own validations"
  ON public.validations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Backfill profile for existing user
INSERT INTO public.user_profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
