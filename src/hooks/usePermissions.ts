import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import * as permissionsService from '@/services/permissions';
import type { Permission as ServicePermission, PermissionTemplate } from '@/services/permissions';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
}

export interface RolePermission {
  role: string;
  permission_id: string;
  granted: boolean;
}

export function usePermissions() {
  const { userRole, user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      // Lazy load database to avoid module initialization issues
      const { db } = await import('@/lib/database');
      const { data: permissionsData, error: permissionsError } = await db
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .order('category, name');

      // Handle missing table gracefully
      if (permissionsError) {
        const errorMessage = permissionsError.message || String(permissionsError);
        // Check for missing table error (42P01 is PostgreSQL error code for "undefined_table")
        if (errorMessage.includes('does not exist') || errorMessage.includes('42P01') || 
            (errorMessage.includes('Database API error') && errorMessage.includes('relation'))) {
          console.warn('permissions table does not exist yet - feature not implemented');
          setPermissions([]);
          setRolePermissions([]);
          setLoading(false);
          return;
        }
        throw permissionsError;
      }
      setPermissions(permissionsData || []);

      // Fetch role permissions for current user's role
      if (userRole) {
        const { data: rolePermData, error: rolePermError } = await db
          .from('role_permissions')
          .select('*')
          .eq('role', userRole);

        // Handle missing table gracefully
        if (rolePermError) {
          const errorMessage = rolePermError.message || String(rolePermError);
          if (errorMessage.includes('does not exist') || errorMessage.includes('42P01') || 
              (errorMessage.includes('Database API error') && errorMessage.includes('relation'))) {
            console.warn('role_permissions table does not exist yet - feature not implemented');
            setRolePermissions([]);
          } else {
            throw rolePermError;
          }
        } else {
          setRolePermissions(rolePermData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permissionName: string): boolean => {
    const permission = permissions.find(p => p.name === permissionName);
    if (!permission) return false;

    const rolePermission = rolePermissions.find(rp => rp.permission_id === permission.id);
    return rolePermission?.granted || false;
  }, [permissions, rolePermissions]);
  
  const checkPermission = useCallback(async (permissionName: string): Promise<boolean> => {
    try {
      if (!user?.id) return false;
      
      const { db } = await import('@/lib/database');
      const { data, error } = await db.rpc('has_permission', {
        p_user_id: user.id,
        p_permission: permissionName
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }, [user?.id]);

  // New methods for permission management
  const updateRolePermissions = useCallback(async (
    role: string,
    permissions: Array<{ permission_id: string; granted: boolean }>
  ): Promise<void> => {
    try {
      await permissionsService.updateRolePermissions(role, permissions);
      toast.success('Role permissions updated successfully');
      await fetchPermissions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role permissions');
      throw error;
    }
  }, [fetchPermissions]);

  const updateUserPermissions = useCallback(async (
    userId: string,
    permissions: Array<{
      permission_id: string;
      granted: boolean;
      reason?: string;
      expires_at?: string;
    }>
  ): Promise<void> => {
    try {
      await permissionsService.updateUserPermissions(userId, permissions);
      toast.success('User permissions updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user permissions');
      throw error;
    }
  }, []);

  const getPermissionCategories = useCallback(async (): Promise<string[]> => {
    try {
      return await permissionsService.getPermissionCategories();
    } catch (error: any) {
      toast.error(error.message || 'Failed to load categories');
      return [];
    }
  }, []);

  const getPermissionTemplates = useCallback(async (): Promise<PermissionTemplate[]> => {
    try {
      return await permissionsService.getPermissionTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Failed to load templates');
      return [];
    }
  }, []);

  const applyTemplate = useCallback(async (
    templateId: string,
    targetRoles: string[],
    type: 'roles' | 'users' = 'roles'
  ): Promise<void> => {
    try {
      await permissionsService.applyTemplate(templateId, type, targetRoles);
      toast.success('Template applied successfully');
      await fetchPermissions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply template');
      throw error;
    }
  }, [fetchPermissions]);

  const exportPermissions = useCallback(async () => {
    try {
      return await permissionsService.exportPermissions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to export permissions');
      throw error;
    }
  }, []);

  const importPermissions = useCallback(async (data: {
    permissions: ServicePermission[];
    role_permissions: any[];
    user_permissions?: any[];
    templates?: PermissionTemplate[];
  }): Promise<void> => {
    try {
      await permissionsService.importPermissions(data);
      toast.success('Permissions imported successfully');
      await fetchPermissions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to import permissions');
      throw error;
    }
  }, [fetchPermissions]);

  return {
    permissions,
    rolePermissions,
    loading,
    hasPermission,
    checkPermission,
    refetch: fetchPermissions,
    // New methods
    updateRolePermissions,
    updateUserPermissions,
    getPermissionCategories,
    getPermissionTemplates,
    applyTemplate,
    exportPermissions,
    importPermissions,
  };
}