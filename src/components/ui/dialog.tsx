"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/** Dialog: a banner pinned over the wall, with a hard shadow and a keyline. */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  size = "md",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const width = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-90 bg-wall-deep/85",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-100 w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2",
          "max-h-[calc(100dvh-2rem)] overflow-y-auto",
          "border-2 border-keyline bg-surface shadow-[var(--shadow-hard-lg)]",
          width,
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Tutup"
          className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-[2px] border-2 border-line bg-wall-deep text-muted transition-colors hover:border-keyline hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" strokeWidth={2.6} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-b-2 border-line px-4 py-3 pr-12",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("tng-display-tight text-lg", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1 text-[0.8125rem] leading-snug text-muted", className)}
      {...props}
    />
  );
}

export function DialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-4", className)} {...props} />;
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t-2 border-line px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}
