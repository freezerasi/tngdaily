import type { UserRole } from "@/types/domain";

export type RoleKey = Exclude<UserRole, "reader">;

export interface UserRoleAssignment {
  user_id: string;
  role_id: string;
  role_key: RoleKey;
  assigned_by: string | null;
  expires_at: string | null;
}

export interface AssignRoleInput {
  target_user_id: string;
  role_key: RoleKey;
  expires_at?: string | null;
}

export interface UpdateRoleExpiryInput {
  target_user_id: string;
  role_key: RoleKey;
  expires_at: string;
}

export interface RevokeRoleInput {
  target_user_id: string;
  role_key: RoleKey;
}

export interface RoleManagementResult {
  ok: boolean;
  error?: string;
}
