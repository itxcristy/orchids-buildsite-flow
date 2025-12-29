-- ============================================================================
-- BuildFlow ERP - Documents Management Tables Migration
-- ============================================================================
-- This migration creates tables for document management with folders, versions, and permissions
-- Database: buildflow_db
-- Created: 2025-01-15
-- ============================================================================

-- ============================================================================
-- DOCUMENT FOLDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parent_folder_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.document_folders IS 'Hierarchical folder structure for organizing documents';
COMMENT ON COLUMN public.document_folders.parent_folder_id IS 'Parent folder ID for nested folder structure (NULL for root folders)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_folders_agency_id ON public.document_folders(agency_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_folder_id ON public.document_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_created_by ON public.document_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_document_folders_name ON public.document_folders(name);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    file_type TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT false,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.documents IS 'Document metadata and file information';
COMMENT ON COLUMN public.documents.file_path IS 'Path to the file in storage (bucket/file_path format)';
COMMENT ON COLUMN public.documents.tags IS 'Array of tags for document categorization';
COMMENT ON COLUMN public.documents.is_public IS 'Whether document is publicly accessible';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_agency_id ON public.documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_name ON public.documents(name);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON public.documents(is_public);

-- ============================================================================
-- DOCUMENT VERSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_summary TEXT,
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.document_versions IS 'Version history for documents';
COMMENT ON COLUMN public.document_versions.is_current IS 'Whether this version is the current active version';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_uploaded_by ON public.document_versions(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_versions_is_current ON public.document_versions(is_current);
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_unique ON public.document_versions(document_id, version_number);

-- ============================================================================
-- DOCUMENT PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT,
    permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write', 'admin')),
    granted_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(document_id, user_id)
);

COMMENT ON TABLE public.document_permissions IS 'User permissions for accessing documents';
COMMENT ON COLUMN public.document_permissions.permission_type IS 'Type of permission: read, write, or admin';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_permissions_document_id ON public.document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user_id ON public.document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_permission_type ON public.document_permissions(permission_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at triggers
CREATE TRIGGER update_document_folders_updated_at
    BEFORE UPDATE ON public.document_folders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure only one current version per document
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_one_current 
    ON public.document_versions(document_id) 
    WHERE is_current = true;
