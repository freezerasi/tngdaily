'use server';

import { assignRole } from '@/lib/database/roles';
import { requireRoleManagementPermission } from '@/lib/database/roles/permissions';
import type { AssignRoleInput, RoleManagementResult } from '@/lib/database/roles/types';
import { revalidateTag } from 'next/cache';

export async function assignRoleAction(
  input: AssignRoleInput
): Promise<RoleManagementResult> {
  try {
    await requireRoleManagementPermission();
    
    // Validate input
    if (!input.target_user_id) {
      return { ok: false, error: 'Target user ID is required' };
    }
    if (!input.role_key) {
      return { ok: false, error: 'Role key is required' };
    }
    
    // Call RPC
    const result = await assignRole(input);
    
    if (result.ok) {
      // Invalidate user roles cache
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
