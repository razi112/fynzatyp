-- Create typing_sessions table to store practice results
CREATE TABLE public.typing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wpm INTEGER NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  text_length TEXT NOT NULL,
  text_topic TEXT NOT NULL,
  correct_chars INTEGER NOT NULL,
  incorrect_chars INTEGER NOT NULL,
  total_chars INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.typing_sessions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own sessions"
ON public.typing_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.typing_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Everyone can view leaderboard data (top scores)
CREATE POLICY "Anyone can view leaderboard"
ON public.typing_sessions FOR SELECT
USING (true);

-- Create index for leaderboard queries
CREATE INDEX idx_typing_sessions_wpm ON public.typing_sessions(wpm DESC);
CREATE INDEX idx_typing_sessions_user_id ON public.typing_sessions(user_id);