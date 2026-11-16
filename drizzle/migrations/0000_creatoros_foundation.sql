-- Utility: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TYPE public.workspace_role AS ENUM ('owner','admin','editor','viewer');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  active_workspace_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  default_language text NOT NULL DEFAULT 'English',
  timezone text NOT NULL DEFAULT 'UTC',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX workspace_members_user_idx ON public.workspace_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Membership helpers (security definer avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _roles public.workspace_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.shares_workspace_with(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members a
    JOIN public.workspace_members b ON a.workspace_id = b.workspace_id
    WHERE a.user_id = auth.uid() AND b.user_id = _other);
$$;

-- Profiles policies
CREATE POLICY "Read own or teammate profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_workspace_with(id));
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Workspace policies
CREATE POLICY "Members read workspace" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id) OR created_by = auth.uid());
CREATE POLICY "Users create workspaces" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owners/admins update workspace" ON public.workspaces FOR UPDATE TO authenticated
  USING (public.has_workspace_role(id, ARRAY['owner','admin']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(id, ARRAY['owner','admin']::public.workspace_role[]));
CREATE POLICY "Owners delete workspace" ON public.workspaces FOR DELETE TO authenticated
  USING (public.has_workspace_role(id, ARRAY['owner']::public.workspace_role[]));

-- Member policies
CREATE POLICY "Members read members" ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Owners/admins add members" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[]) AND role <> 'owner');
CREATE POLICY "Owners/admins change members" ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[]) AND role <> 'owner')
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[]) AND role <> 'owner');
CREATE POLICY "Owners/admins remove members or self-leave" ON public.workspace_members FOR DELETE TO authenticated
  USING (role <> 'owner' AND (user_id = auth.uid() OR public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[])));

-- New workspace -> creator becomes owner
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_workspace_created AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- New auth user -> profile + personal workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _name text;
  _ws uuid;
BEGIN
  _name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NULLIF(NEW.raw_user_meta_data->>'name',''), split_part(NEW.email, '@', 1), 'Creator');
  INSERT INTO public.workspaces (name, created_by)
  VALUES (left(_name || '''s workspace', 80), NEW.id) RETURNING id INTO _ws;
  INSERT INTO public.profiles (id, display_name, avatar_url, active_workspace_id)
  VALUES (NEW.id, _name, NEW.raw_user_meta_data->>'avatar_url', _ws)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workspaces_updated BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AI provider configurations (no secrets here)
CREATE TABLE public.ai_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('openai','anthropic','google','openai_compatible')),
  capability text NOT NULL DEFAULT 'text' CHECK (capability IN ('text','image','video','voice')),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  base_url text,
  default_model text NOT NULL,
  key_hint text,
  status text NOT NULL DEFAULT 'untested' CHECK (status IN ('untested','ok','error')),
  last_tested_at timestamptz,
  last_error text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_provider_configs_ws_idx ON public.ai_provider_configs(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provider_configs TO authenticated;
GRANT ALL ON public.ai_provider_configs TO service_role;
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read providers" ON public.ai_provider_configs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Admins add providers" ON public.ai_provider_configs FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[]));
CREATE POLICY "Admins update providers" ON public.ai_provider_configs FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[]));
CREATE POLICY "Admins delete providers" ON public.ai_provider_configs FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin']::public.workspace_role[]));
CREATE TRIGGER ai_provider_configs_updated BEFORE UPDATE ON public.ai_provider_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Encrypted keys: server-only
CREATE TABLE public.ai_provider_secrets (
  config_id uuid PRIMARY KEY REFERENCES public.ai_provider_configs(id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_provider_secrets TO service_role;
ALTER TABLE public.ai_provider_secrets ENABLE ROW LEVEL SECURITY;

-- AI usage / error log
CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_config_id uuid REFERENCES public.ai_provider_configs(id) ON DELETE SET NULL,
  provider_label text NOT NULL,
  model text NOT NULL,
  feature text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','error')),
  error_message text,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_events_ws_idx ON public.ai_usage_events(workspace_id, created_at DESC);
GRANT SELECT, INSERT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read usage" ON public.ai_usage_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members log own usage" ON public.ai_usage_events FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_workspace_member(workspace_id));

-- Scripts
CREATE TABLE public.scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  topic text NOT NULL,
  language text NOT NULL DEFAULT 'English',
  tone text NOT NULL DEFAULT 'Conversational',
  audience text,
  duration_minutes integer NOT NULL DEFAULT 8,
  hook text,
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  outro text,
  generated_with text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scripts_ws_idx ON public.scripts(workspace_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read scripts" ON public.scripts FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Editors create scripts" ON public.scripts FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.has_workspace_role(workspace_id, ARRAY['owner','admin','editor']::public.workspace_role[]));
CREATE POLICY "Editors update scripts" ON public.scripts FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','editor']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','editor']::public.workspace_role[]));
CREATE POLICY "Editors delete scripts" ON public.scripts FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','editor']::public.workspace_role[]));
CREATE TRIGGER scripts_updated BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEO packages
CREATE TABLE public.seo_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  topic text NOT NULL,
  language text NOT NULL DEFAULT 'English',
  titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  upload_tips jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_with text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seo_packages_ws_idx ON public.seo_packages(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_packages TO authenticated;
GRANT ALL ON public.seo_packages TO service_role;
ALTER TABLE public.seo_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read seo" ON public.seo_packages FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Editors create seo" ON public.seo_packages FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.has_workspace_role(workspace_id, ARRAY['owner','admin','editor']::public.workspace_role[]));
CREATE POLICY "Editors update seo" ON public.seo_packages FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','editor']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner','admin','editor']::public.workspace_role[]));
CREATE POLICY "Editors delete seo" ON public.seo_packages FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, ARRAY['owner','admin','editor']::public.workspace_role[]));
CREATE TRIGGER seo_packages_updated BEFORE UPDATE ON public.seo_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();