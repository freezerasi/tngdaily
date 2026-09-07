"use client";

import * as React from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";

import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { TapePatch } from "@/components/shared/tape-patch";
import { WordMark } from "@/components/shared/word-mark";
import type { UserRole } from "@/types/domain";

/**
 * Mobile admin drawer. Slides in from the left so the trigger stays under the
 * thumb on the header's leading edge.
 */
export function AdminMobileNav({
  role,
  name,
}: {
  role: UserRole;
  name: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label="Buka menu dashboard"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-[2px] border-2 border-line bg-surface text-muted transition-colors hover:border-keyline hover:text-foreground"
      >
        <Menu aria-hidden="true" className="size-4" strokeWidth={2.6} />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-90 bg-wall-deep/85 lg:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-100 flex w-[17rem] flex-col border-r-2 border-keyline bg-wall-deep lg:hidden"
          aria-describedby={undefined}
        >
          <div className="flex items-center gap-2 border-b-2 border-keyline p-3">
            <WordMark size="sm" asLink={false} />
            <DialogPrimitive.Title className="sr-only">
              Menu dashboard
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Tutup menu"
              className="ml-auto inline-flex size-8 items-center justify-center rounded-[2px] border-2 border-line bg-surface text-muted hover:border-keyline hover:text-foreground"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={2.6} />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <AdminNav role={role} onNavigate={() => setOpen(false)} />
          </div>

          <div className="border-t-2 border-line p-3">
            <p className="truncate font-display text-sm font-extrabold text-foreground">
              {name}
            </p>
            <TapePatch tone="lime" size="sm" className="mt-1.5">
              {role}
            </TapePatch>
            <div className="mt-3 grid gap-1.5">
              <Link
                href="/"
                className="tng-label text-muted hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Lihat situs
              </Link>
              <SignOutButton />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
