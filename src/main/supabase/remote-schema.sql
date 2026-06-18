-- ============================================================================
-- UPweb TimeTracker - Supabase Remote Schema
-- ============================================================================
-- Run this SQL in the Supabase SQL editor to set up the remote schema.
-- This creates tables with Row Level Security (RLS) policies so users
-- can only access their own data.
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Fresh reset
-- ============================================================================
DROP TABLE IF EXISTS public.task_tags CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.columns CASCADE;
DROP TABLE IF EXISTS public.boards CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.entry_tags CASCADE;
DROP TABLE IF EXISTS public.time_entries CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- ============================================================================
-- Helper function to get current user ID (in public schema)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.uid() RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- Clients Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can only see their own clients
CREATE POLICY "users_can_view_own_clients" ON public.clients
  FOR SELECT USING (public.uid() = user_id);

-- RLS Policy: users can only insert their own clients
CREATE POLICY "users_can_insert_own_clients" ON public.clients
  FOR INSERT WITH CHECK (public.uid() = user_id);

-- RLS Policy: users can only update their own clients
CREATE POLICY "users_can_update_own_clients" ON public.clients
  FOR UPDATE USING (public.uid() = user_id);

-- RLS Policy: users can only delete their own clients
CREATE POLICY "users_can_delete_own_clients" ON public.clients
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Tags Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "users_can_view_own_tags" ON public.tags
  FOR SELECT USING (public.uid() = user_id);
CREATE POLICY "users_can_insert_own_tags" ON public.tags
  FOR INSERT WITH CHECK (public.uid() = user_id);
CREATE POLICY "users_can_update_own_tags" ON public.tags
  FOR UPDATE USING (public.uid() = user_id);
CREATE POLICY "users_can_delete_own_tags" ON public.tags
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Projects Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  client_id text REFERENCES public.clients(id) ON DELETE SET NULL,
  hourly_rate real,
  archived boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "users_can_view_own_projects" ON public.projects
  FOR SELECT USING (public.uid() = user_id);
CREATE POLICY "users_can_insert_own_projects" ON public.projects
  FOR INSERT WITH CHECK (public.uid() = user_id);
CREATE POLICY "users_can_update_own_projects" ON public.projects
  FOR UPDATE USING (public.uid() = user_id);
CREATE POLICY "users_can_delete_own_projects" ON public.projects
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Time Entries Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.time_entries (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  project_id text REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id text,
  billable boolean DEFAULT true NOT NULL,
  invoice_id text,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
);

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS task_id text;

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS invoice_id text;

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "users_can_view_own_entries" ON public.time_entries
  FOR SELECT USING (public.uid() = user_id);
CREATE POLICY "users_can_insert_own_entries" ON public.time_entries
  FOR INSERT WITH CHECK (public.uid() = user_id);
CREATE POLICY "users_can_update_own_entries" ON public.time_entries
  FOR UPDATE USING (public.uid() = user_id);
CREATE POLICY "users_can_delete_own_entries" ON public.time_entries
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Entry Tags Junction Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.entry_tags (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id text REFERENCES public.time_entries(id) ON DELETE CASCADE NOT NULL,
  tag_id text REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  synced_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.entry_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "users_can_view_own_entry_tags" ON public.entry_tags
  FOR SELECT USING (public.uid() = user_id);
CREATE POLICY "users_can_insert_own_entry_tags" ON public.entry_tags
  FOR INSERT WITH CHECK (public.uid() = user_id);
CREATE POLICY "users_can_update_own_entry_tags" ON public.entry_tags
  FOR UPDATE USING (public.uid() = user_id);
CREATE POLICY "users_can_delete_own_entry_tags" ON public.entry_tags
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Invoices Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  number text NOT NULL,
  client_id text REFERENCES public.clients(id) ON DELETE SET NULL,
  status text DEFAULT 'draft' NOT NULL,
  issue_date timestamptz NOT NULL,
  due_date timestamptz NOT NULL,
  notes text,
  tax_rate real DEFAULT 0 NOT NULL,
  discount real DEFAULT 0 NOT NULL,
  currency text DEFAULT 'USD' NOT NULL,
  paid_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "users_can_view_own_invoices" ON public.invoices
  FOR SELECT USING (public.uid() = user_id);
CREATE POLICY "users_can_insert_own_invoices" ON public.invoices
  FOR INSERT WITH CHECK (public.uid() = user_id);
CREATE POLICY "users_can_update_own_invoices" ON public.invoices
  FOR UPDATE USING (public.uid() = user_id);
CREATE POLICY "users_can_delete_own_invoices" ON public.invoices
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Invoice Items Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id text REFERENCES public.invoices(id) ON DELETE CASCADE,
  entry_id text REFERENCES public.time_entries(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity real NOT NULL,
  unit_price real NOT NULL,
  amount real NOT NULL,
  synced_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "users_can_view_own_invoice_items" ON public.invoice_items
  FOR SELECT USING (public.uid() = user_id);
CREATE POLICY "users_can_insert_own_invoice_items" ON public.invoice_items
  FOR INSERT WITH CHECK (public.uid() = user_id);
CREATE POLICY "users_can_update_own_invoice_items" ON public.invoice_items
  FOR UPDATE USING (public.uid() = user_id);
CREATE POLICY "users_can_delete_own_invoice_items" ON public.invoice_items
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Boards Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.boards (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_boards" ON public.boards;
CREATE POLICY "users_can_view_own_boards" ON public.boards
  FOR SELECT USING (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_insert_own_boards" ON public.boards;
CREATE POLICY "users_can_insert_own_boards" ON public.boards
  FOR INSERT WITH CHECK (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_update_own_boards" ON public.boards;
CREATE POLICY "users_can_update_own_boards" ON public.boards
  FOR UPDATE USING (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_delete_own_boards" ON public.boards;
CREATE POLICY "users_can_delete_own_boards" ON public.boards
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Columns Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.columns (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id text REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  "order" integer NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
);

ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_columns" ON public.columns;
CREATE POLICY "users_can_view_own_columns" ON public.columns
  FOR SELECT USING (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_insert_own_columns" ON public.columns;
CREATE POLICY "users_can_insert_own_columns" ON public.columns
  FOR INSERT WITH CHECK (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_update_own_columns" ON public.columns;
CREATE POLICY "users_can_update_own_columns" ON public.columns
  FOR UPDATE USING (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_delete_own_columns" ON public.columns;
CREATE POLICY "users_can_delete_own_columns" ON public.columns
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Tasks Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  column_id text REFERENCES public.columns(id) ON DELETE CASCADE NOT NULL,
  board_id text REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  "order" integer NOT NULL,
  priority text DEFAULT 'none' NOT NULL,
  due_date timestamptz,
  assignee text,
  estimated_minutes integer,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_tasks" ON public.tasks;
CREATE POLICY "users_can_view_own_tasks" ON public.tasks
  FOR SELECT USING (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_insert_own_tasks" ON public.tasks;
CREATE POLICY "users_can_insert_own_tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_update_own_tasks" ON public.tasks;
CREATE POLICY "users_can_update_own_tasks" ON public.tasks
  FOR UPDATE USING (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_delete_own_tasks" ON public.tasks;
CREATE POLICY "users_can_delete_own_tasks" ON public.tasks
  FOR DELETE USING (public.uid() = user_id);

-- ============================================================================
-- Task Tags Junction Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_tags (
  id text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id text REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  tag_id text REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  synced_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_task_tags" ON public.task_tags;
CREATE POLICY "users_can_view_own_task_tags" ON public.task_tags
  FOR SELECT USING (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_insert_own_task_tags" ON public.task_tags;
CREATE POLICY "users_can_insert_own_task_tags" ON public.task_tags
  FOR INSERT WITH CHECK (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_update_own_task_tags" ON public.task_tags;
CREATE POLICY "users_can_update_own_task_tags" ON public.task_tags
  FOR UPDATE USING (public.uid() = user_id);
DROP POLICY IF EXISTS "users_can_delete_own_task_tags" ON public.task_tags;
CREATE POLICY "users_can_delete_own_task_tags" ON public.task_tags
  FOR DELETE USING (public.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'time_entries_task_id_fkey'
  ) THEN
    ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'time_entries_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- Indexes for better query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_remote_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_clients_updated_at ON public.clients(updated_at);
CREATE INDEX IF NOT EXISTS idx_remote_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_tags_updated_at ON public.tags(updated_at);
CREATE INDEX IF NOT EXISTS idx_remote_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_remote_projects_updated_at ON public.projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_remote_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_time_entries_start_at ON public.time_entries(start_at);
CREATE INDEX IF NOT EXISTS idx_remote_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_remote_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_remote_time_entries_invoice_id ON public.time_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_remote_time_entries_updated_at ON public.time_entries(updated_at);
CREATE INDEX IF NOT EXISTS idx_remote_entry_tags_entry_id ON public.entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS idx_remote_entry_tags_tag_id ON public.entry_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_remote_entry_tags_user_id ON public.entry_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_remote_invoices_updated_at ON public.invoices(updated_at);
CREATE INDEX IF NOT EXISTS idx_remote_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_remote_invoice_items_entry_id ON public.invoice_items(entry_id);
CREATE INDEX IF NOT EXISTS idx_remote_invoice_items_user_id ON public.invoice_items(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_boards_user_id ON public.boards(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_boards_project_id ON public.boards(project_id);
CREATE INDEX IF NOT EXISTS idx_remote_boards_updated_at ON public.boards(updated_at);
CREATE INDEX IF NOT EXISTS idx_remote_columns_user_id ON public.columns(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_columns_board_id ON public.columns(board_id);
CREATE INDEX IF NOT EXISTS idx_remote_columns_order ON public.columns("order");
CREATE INDEX IF NOT EXISTS idx_remote_columns_updated_at ON public.columns(updated_at);
CREATE INDEX IF NOT EXISTS idx_remote_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_tasks_board_id ON public.tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_remote_tasks_column_id ON public.tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_remote_tasks_order ON public.tasks("order");
CREATE INDEX IF NOT EXISTS idx_remote_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_remote_tasks_updated_at ON public.tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_remote_task_tags_user_id ON public.task_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_task_tags_task_id ON public.task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_remote_task_tags_tag_id ON public.task_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_remote_task_tags_updated_at ON public.task_tags(updated_at);

-- ============================================================================
-- Trigger function to auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON public.time_entries;
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_boards_updated_at ON public.boards;
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_columns_updated_at ON public.columns;
CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON public.columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_tags_updated_at ON public.task_tags;
CREATE TRIGGER update_task_tags_updated_at BEFORE UPDATE ON public.task_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
