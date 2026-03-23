-- Add subspecialty to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subspecialty text DEFAULT 'general_ortho';

-- Add accuracy tracking columns to user_profiles for coding accuracy score
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS total_validations integer DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS clean_validations integer DEFAULT 0;
