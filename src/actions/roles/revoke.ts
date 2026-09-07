'use server';

import { revokeRole } from '@/lib/database/roles';
import { requireRoleManagementPermission } from '@/lib/database/roles/permissions';
import type { RevokeRoleInput, RoleManagementResult } from '@/lib/database/roles/types';
import { revalidateTag } from 'next/cache';

export async function revokeRoleAction(
  input: RevokeRoleInput
): Promise<RoleManagementResult> {
  try {
    await requireRoleManagementPermission();
    
    if (!input.target_user_id) {
      return { ok: false, error: 'Target user ID is required' };
    }
    if (!input.role_key) {
      return { ok: false, error: 'Role key is required' };
    }
    
    const result = await revokeRole(input);
    
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
