import { getServerSupabase } from '@/lib/supabase/server';

export async function checkRoleManagementPermission(): Promise<boolean> {
  const supabase = await getServerSupabase();
  if (!supabase) return false;
  
  const { data, error } = await supabase.rpc('tng_has_permission', {
    p_permission: 'user.manage_roles',
  });

  if (error || !data) {
    return false;
  }

  return data as boolean;
}

export async function requireRoleManagementPermission(): Promise<void> {
  const hasPermission = await checkRoleManagementPermission();
  
  if (!hasPermission) {
    throw new Error('Missing permission: user.manage_roles');
  }
}
