import { getServerSupabase } from '@/lib/supabase/server';
import type { 
  AssignRoleInput, 
  UpdateRoleExpiryInput, 
  RevokeRoleInput, 
  RoleManagementResult 
} from './types';

export async function assignRole(
  input: AssignRoleInput
): Promise<RoleManagementResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Database connection not available' };
  
  const { data, error } = await supabase.rpc('tng_assign_role', {
    p_target_user_id: input.target_user_id,
    p_role_key: input.role_key,
    p_expires_at: input.expires_at ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return data as RoleManagementResult;
}

export async function updateRoleExpiry(
  input: UpdateRoleExpiryInput
): Promise<RoleManagementResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Database connection not available' };
  
  const { data, error } = await supabase.rpc('tng_update_role_expiry', {
    p_target_user_id: input.target_user_id,
    p_role_key: input.role_key,
    p_expires_at: input.expires_at,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return data as RoleManagementResult;
}

export async function revokeRole(
  input: RevokeRoleInput
): Promise<RoleManagementResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Database connection not available' };
  
  const { data, error } = await supabase.rpc('tng_revoke_role', {
    p_target_user_id: input.target_user_id,
    p_role_key: input.role_key,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return data as RoleManagementResult;
}
