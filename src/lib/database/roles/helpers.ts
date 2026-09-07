import { getServerSupabase } from '@/lib/supabase/server';
import type { UserRoleAssignment, RoleKey } from './types';

type UserRoleRow = {
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  expires_at: string | null;
  roles: { key: RoleKey } | Array<{ key: RoleKey }> | null;
};

export async function getUserRoles(userId: string): Promise<UserRoleAssignment[]> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error('Database connection not available');
  
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      user_id,
      role_id,
      assigned_by,
      expires_at,
      roles!inner(key)
    `)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as UserRoleRow[];

  return rows.map((row) => {
    const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    if (!role) {
      throw new Error(`Role relation missing for user role assignment ${row.user_id}:${row.role_id}`);
    }

    return {
      user_id: row.user_id,
      role_id: row.role_id,
      role_key: role.key,
      assigned_by: row.assigned_by,
      expires_at: row.expires_at,
    };
  });
}

export async function getCurrentUserRoles(): Promise<UserRoleAssignment[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }
  
  return getUserRoles(user.id);
}

export async function hasRole(userId: string, roleKey: RoleKey): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.some(r => r.role_key === roleKey);
}

export async function hasAnyRole(userId: string, roleKeys: RoleKey[]): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.some(r => roleKeys.includes(r.role_key));
}
