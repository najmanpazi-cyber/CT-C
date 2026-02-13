
CREATE TABLE public.coding_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clinical_input_preview TEXT,
  suggested_code TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  correct_code TEXT,
  additional_feedback TEXT,
  session_id TEXT
);

ALTER TABLE public.coding_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous feedback inserts" ON public.coding_feedback
  FOR INSERT WITH CHECK (true);
