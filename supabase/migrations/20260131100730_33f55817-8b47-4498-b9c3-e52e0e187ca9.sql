-- Create enum for race status
CREATE TYPE public.race_status AS ENUM ('waiting', 'countdown', 'in_progress', 'completed');

-- Create typing races table
CREATE TABLE public.typing_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_code TEXT NOT NULL UNIQUE,
  status race_status NOT NULL DEFAULT 'waiting',
  race_text TEXT NOT NULL,
  text_topic TEXT NOT NULL DEFAULT 'motivation',
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  max_players INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Create race participants table
CREATE TABLE public.race_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID NOT NULL REFERENCES public.typing_races(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  wpm INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC NOT NULL DEFAULT 100,
  finished_at TIMESTAMPTZ,
  position INTEGER,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(race_id, user_id)
);

-- Enable RLS
ALTER TABLE public.typing_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for typing_races
CREATE POLICY "Anyone can view races"
ON public.typing_races FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create races"
ON public.typing_races FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update their race"
ON public.typing_races FOR UPDATE
TO authenticated
USING (auth.uid() = host_user_id);

-- RLS policies for race_participants
CREATE POLICY "Anyone can view race participants"
ON public.race_participants FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join races"
ON public.race_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.race_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_races;
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_participants;

-- Create indexes for performance
CREATE INDEX idx_races_join_code ON public.typing_races(join_code);
CREATE INDEX idx_races_status ON public.typing_races(status);
CREATE INDEX idx_participants_race_id ON public.race_participants(race_id);
CREATE INDEX idx_participants_user_id ON public.race_participants(user_id);