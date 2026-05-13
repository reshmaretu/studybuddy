-- Create synthetic_logs table for status broadcasts
CREATE TABLE IF NOT EXISTS public.synthetic_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  broadcast_type VARCHAR(50) DEFAULT 'custom-status' CHECK (broadcast_type IN ('custom-status', 'milestone', 'quest-progress', 'feedback')),
  reactions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_synthetic_logs_user_id ON public.synthetic_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_synthetic_logs_created_at ON public.synthetic_logs(created_at DESC);

-- Create user_friendships table
CREATE TABLE IF NOT EXISTS public.user_friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT different_users CHECK (user_id_1 < user_id_2)
);

-- Create indexes for friendships
CREATE INDEX IF NOT EXISTS idx_friendships_user_id_1 ON public.user_friendships(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id_2 ON public.user_friendships(user_id_2);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.user_friendships(status);

-- Create pacts (constellations) table
CREATE TABLE IF NOT EXISTS public.pacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pact_name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  constellation_color VARCHAR(7) NOT NULL DEFAULT '#FF1493',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_pacts_created_by ON public.pacts(created_by);

-- Create pact_members table
CREATE TABLE IF NOT EXISTS public.pact_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pact_id UUID NOT NULL REFERENCES public.pacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pact_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pact_members_pact_id ON public.pact_members(pact_id);
CREATE INDEX IF NOT EXISTS idx_pact_members_user_id ON public.pact_members(user_id);

-- Enable Row Level Security
ALTER TABLE public.synthetic_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pact_members ENABLE ROW LEVEL SECURITY;

-- Policies for synthetic_logs
CREATE POLICY "Users can view all synthetic logs" 
  ON public.synthetic_logs FOR SELECT 
  USING (true);

CREATE POLICY "Users can create their own synthetic logs" 
  ON public.synthetic_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policies for user_friendships
CREATE POLICY "Users can view their own friendships" 
  ON public.user_friendships FOR SELECT 
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can create friendship requests" 
  ON public.user_friendships FOR INSERT 
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can update their own friendships" 
  ON public.user_friendships FOR UPDATE 
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2)
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can delete their own friendships" 
  ON public.user_friendships FOR DELETE 
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Policies for pacts
CREATE POLICY "Users can view all pacts they are members of" 
  ON public.pacts FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.pact_members 
    WHERE pact_members.pact_id = pacts.id 
    AND pact_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can create pacts" 
  ON public.pacts FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

-- Policies for pact_members
CREATE POLICY "Users can view pact members they are part of" 
  ON public.pact_members FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.pact_members as pm2 
    WHERE pm2.pact_id = pact_members.pact_id 
    AND pm2.user_id = auth.uid()
  ));

CREATE POLICY "Pact creator can add members" 
  ON public.pact_members FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pacts 
    WHERE pacts.id = pact_members.pact_id 
    AND pacts.created_by = auth.uid()
  ));

CREATE POLICY "Users can leave pacts" 
  ON public.pact_members FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies for profiles
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');
