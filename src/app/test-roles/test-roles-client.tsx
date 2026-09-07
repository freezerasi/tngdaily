"use client";

import { useState } from "react";
import { assignRoleAction } from "@/actions/roles/assign";
import { revokeRoleAction } from "@/actions/roles/revoke";
import { updateRoleExpiryAction } from "@/actions/roles/update-expiry";
import type { RoleKey } from "@/lib/database/roles/types";

type RoleAction = "assign" | "update-expiry" | "revoke";

export default function TestRolesClient() {
  const [targetUserId, setTargetUserId] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>("editor");
  const [expiresAt, setExpiresAt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<RoleAction | null>(null);

  async function runAction(action: RoleAction) {
    setLoading(true);
    setActiveAction(action);
    setResult(null);

    try {
      const res =
        action === "assign"
          ? await assignRoleAction({
              target_user_id: targetUserId,
              role_key: roleKey,
              expires_at: expiresAt || null,
            })
          : action === "update-expiry"
            ? await updateRoleExpiryAction({
                target_user_id: targetUserId,
                role_key: roleKey,
                expires_at: expiresAt,
              })
            : await revokeRoleAction({
                target_user_id: targetUserId,
                role_key: roleKey,
              });

      setResult(JSON.stringify({ action, ...res }, null, 2));
    } catch (err) {
      setResult(String(err));
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runAction("assign");
  }

  return (
    <div className="min-h-screen bg-[#0b0d0e] p-8 text-[#f4f4ef]">
      <div className="mx-auto max-w-lg rounded-xl border border-[#2e3335] bg-[#151819] p-6 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-white">Test Role Management</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Uji RPC assign, update expiry, dan revoke melalui Server Action.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-200">
              Target User ID (UUID)
            </label>
            <input
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-lg border border-[#3b4043] bg-[#1c1f20] p-2.5 text-sm text-white placeholder-neutral-500 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
              required
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-200">
              Role Key
            </label>
            <select
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value as RoleKey)}
              className="w-full rounded-lg border border-[#3b4043] bg-[#1c1f20] p-2.5 text-sm text-white focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
            >
              <option value="owner">owner</option>
              <option value="managing_editor">managing_editor</option>
              <option value="editor">editor</option>
              <option value="commercial_manager">commercial_manager</option>
              <option value="media_manager">media_manager</option>
              <option value="writer">writer</option>
              <option value="contributor">contributor</option>
              <option value="analyst">analyst</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-200">
              Expires At
            </label>
            <input
              type="text"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-[#3b4043] bg-[#1c1f20] p-2.5 text-sm text-white placeholder-neutral-500 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
              placeholder="2030-01-01T09:30:00.000Z"
              spellCheck={false}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-lime-400 p-2.5 font-semibold text-black transition-colors hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeAction === "assign" ? "Assigning..." : "Assign Role"}
          </button>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => runAction("update-expiry")}
              disabled={loading || !expiresAt}
              className="rounded-lg bg-[#242829] p-2.5 font-semibold text-white transition-colors hover:bg-[#2e3335] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === "update-expiry" ? "Updating..." : "Update Expiry"}
            </button>

            <button
              type="button"
              onClick={() => runAction("revoke")}
              disabled={loading}
              className="rounded-lg bg-red-500 p-2.5 font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === "revoke" ? "Revoking..." : "Revoke Role"}
            </button>
          </div>
        </form>

        {result ? (
          <div className="mt-6 border-t border-[#2e3335] pt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Result:
            </h2>
            <pre className="max-h-60 overflow-auto rounded-lg border border-[#2e3335] bg-[#0b0d0e] p-4 font-mono text-xs text-lime-400">
              {result}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
