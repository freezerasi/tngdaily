"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * AlertDialog. Used for every consequential action in the CMS: publish,
 * schedule, reject a contribution, delete a key.
 */
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-90 bg-wall-deep/85" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-100 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          "border-2 border-keyline bg-surface shadow-[var(--shadow-hard-lg)]",
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-b-2 border-line px-4 py-3", className)} {...props} />
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("tng-display-tight text-lg", className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("px-4 py-4 text-sm leading-relaxed text-muted", className)}
      {...props}
    />
  );
}

export function AlertDialogFooter({
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

export function AlertDialogAction({
  className,
  variant = "primary",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & {
  variant?: "primary" | "danger" | "secondary";
}) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants({ variant, size: "md" }), className)}
      {...props}
    />
  );
}

export function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline", size: "md" }), className)}
      {...props}
    />
  );
}
