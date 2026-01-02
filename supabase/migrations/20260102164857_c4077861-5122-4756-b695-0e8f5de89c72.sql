-- Add foreign key relationship between typing_sessions and profiles
ALTER TABLE public.typing_sessions
ADD CONSTRAINT typing_sessions_user_id_fkey_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;