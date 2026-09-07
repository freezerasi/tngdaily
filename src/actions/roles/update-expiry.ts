'use server';

import { updateRoleExpiry } from '@/lib/database/roles';
import { requireRoleManagementPermission } from '@/lib/database/roles/permissions';
import type { UpdateRoleExpiryInput, RoleManagementResult } from '@/lib/database/roles/types';
import { revalidateTag } from 'next/cache';

export async function updateRoleExpiryAction(
  input: UpdateRoleExpiryInput
): Promise<RoleManagementResult> {
  try {
    await requireRoleManagementPermission();
    
    if (!input.target_user_id) {
      return { ok: false, error: 'Target user ID is required' };
    }
    if (!input.role_key) {
      return { ok: false, error: 'Role key is required' };
    }
    if (!input.expires_at) {
      return { ok: false, error: 'Expiry date is required' };
    }
    
    const result = await updateRoleExpiry(input);
    
    if (result.ok) {
      revalidateTag('user-roles', 'max');
    }
    
    return result;
  } catch (error) {
    return { 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
