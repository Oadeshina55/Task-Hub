/*
# Task Hub - Role-Based Schema

## Overview
Creates a role-based task management system where a super admin can create, edit, block accounts and assign roles. All data lives in the database (no dummy data in the frontend).

## New Tables

### profiles
- `id` (uuid, primary key, references auth.users)
- `email` (text, unique, not null) - copied from auth.users
- `full_name` (text, nullable) - display name
- `role` (text, not null, default 'member') - one of: 'super_admin', 'admin', 'manager', 'member'
- `status` (text, not null, default 'active') - one of: 'active', 'blocked'
- `created_at` (timestamptz, default now())

### projects
- `id` (uuid, primary key)
- `name` (text, not null)
- `description` (text, nullable)
- `color` (text, default 'coral') - for UI display
- `created_by` (uuid, references profiles)
- `created_at` (timestamptz, default now())

### tasks
- `id` (uuid, primary key)
- `title` (text, not null)
- `description` (text, nullable)
- `status` (text, not null, default 'todo') - one of: 'todo', 'progress', 'done'
- `priority` (text, not null, default 'medium') - one of: 'low', 'medium', 'high'
- `project_id` (uuid, references projects, nullable)
- `assigned_to` (uuid, references profiles, nullable)
- `due_date` (date, nullable)
- `created_by` (uuid, references profiles)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security

### RLS enabled on all tables.

### Profiles
- SELECT: authenticated users can read all profiles (needed to assign tasks, view team).
- INSERT: only super_admin can create new accounts (via SECURITY DEFINER function, since auth.users insert requires service role).
- UPDATE: users can update their own full_name only. Role and status changes go through a SECURITY DEFINER function callable only by super_admin.
- Column-level: REVOKE UPDATE on role, status, email from authenticated so users cannot self-escalate.

### Projects
- SELECT: all authenticated users can view projects.
- INSERT/UPDATE/DELETE: super_admin and admin only (checked via profile role).

### Tasks
- SELECT: all authenticated users can view tasks.
- INSERT: all authenticated users can create tasks (created_by defaults to auth.uid()).
- UPDATE: assigned user, creator, super_admin, admin, manager can update.
- DELETE: super_admin, admin, or creator.

## Privileged Functions
- `create_user(p_email, p_password, p_full_name, p_role)` - super_admin only, creates auth user + profile.
- `update_user_role(p_user_id, p_role)` - super_admin only.
- `update_user_status(p_user_id, p_status)` - super_admin only.
- `update_user_profile(p_full_name)` - self-service, updates own full_name.

## Important Notes
1. The `create_user` function uses `SECURITY DEFINER` with the service role to create auth.users entries, which the anon key cannot do directly.
2. Role and status columns are revoked from direct UPDATE; they go through privileged functions that check the caller is super_admin.
3. A trigger syncs email from auth.users to profiles on creation.
*/

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'manager', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read profiles (needed for task assignment, team view)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Users can update their own profile, but only allowed columns (column-level grants restrict this)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Revoke UPDATE on sensitive columns
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name) ON profiles TO authenticated;

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT 'coral',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_all" ON projects;
CREATE POLICY "projects_select_all" ON projects
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "projects_insert_admin" ON projects;
CREATE POLICY "projects_insert_admin" ON projects
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

DROP POLICY IF EXISTS "projects_update_admin" ON projects;
CREATE POLICY "projects_update_admin" ON projects
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

DROP POLICY IF EXISTS "projects_delete_admin" ON projects;
CREATE POLICY "projects_delete_admin" ON projects
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'progress', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date date,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_all" ON tasks;
CREATE POLICY "tasks_select_all" ON tasks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tasks_insert_auth" ON tasks;
CREATE POLICY "tasks_insert_auth" ON tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "tasks_update_auth" ON tasks;
CREATE POLICY "tasks_update_auth" ON tasks
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'manager'))
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'manager'))
  );

DROP POLICY IF EXISTS "tasks_delete_auth" ON tasks;
CREATE POLICY "tasks_delete_auth" ON tasks
  FOR DELETE TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PRIVILEGED FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- Create new user (super_admin only)
-- Uses pgrx to create auth user via admin API
CREATE OR REPLACE FUNCTION create_user(
  p_email text,
  p_password text,
  p_full_name text DEFAULT NULL,
  p_role text DEFAULT 'member'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_caller_role text;
BEGIN
  -- Check caller is super_admin
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admin can create accounts';
  END IF;

  -- Validate role
  IF p_role NOT IN ('super_admin', 'admin', 'manager', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- Insert into auth.users using the admin API
  -- We use the Supabase auth.admin functions via a helper
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object('role', p_role),
    jsonb_build_object('full_name', p_full_name)
  )
  RETURNING id INTO v_user_id;

  -- Create profile
  INSERT INTO profiles (id, email, full_name, role, status)
  VALUES (v_user_id, lower(p_email), p_full_name, p_role, 'active');

  RETURN v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_user FROM anon;
GRANT EXECUTE ON FUNCTION create_user TO authenticated;

-- Update user role (super_admin only)
CREATE OR REPLACE FUNCTION update_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admin can change roles';
  END IF;

  IF p_role NOT IN ('super_admin', 'admin', 'manager', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE profiles SET role = p_role WHERE id = p_user_id;

  -- Also update the JWT app metadata
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(p_role))
  WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_user_role FROM anon;
GRANT EXECUTE ON FUNCTION update_user_role TO authenticated;

-- Update user status - block/unblock (super_admin only)
CREATE OR REPLACE FUNCTION update_user_status(p_user_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admin can block or unblock accounts';
  END IF;

  IF p_status NOT IN ('active', 'blocked') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE profiles SET status = p_status WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_user_status FROM anon;
GRANT EXECUTE ON FUNCTION update_user_status TO authenticated;

-- Self-service: update own full_name
CREATE OR REPLACE FUNCTION update_own_profile(p_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET full_name = p_full_name WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION update_own_profile FROM anon;
GRANT EXECUTE ON FUNCTION update_own_profile TO authenticated;

-- ============================================
-- TRIGGER: Auto-create profile on auth signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_meta_data->>'role', 'member'),
    'active'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
