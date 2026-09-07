"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Sign out. Clears the Supabase session cookies in the browser, then navigates
 * and refreshes so the server re-reads cookies and middleware sees the change.
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const signOut = async () => {
    setPending(true);
    const supabase = getBrowserSupabase();
    if (!supabase) {
      toast.error("Supabase belum dikonfigurasi.");
      setPending(false);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Gagal keluar. Coba lagi.");
      setPending(false);
      return;
    }

    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={pending}
      className="tng-label inline-flex items-center gap-1.5 text-left text-danger transition-opacity hover:opacity-80 disabled:opacity-55"
    >
      <LogOut aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
      {pending ? "Keluar" : "Keluar"}
    </button>
  );
}
