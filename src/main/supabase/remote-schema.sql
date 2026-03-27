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
  billable boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  synced_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz DEFAULT NOW()
);

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
