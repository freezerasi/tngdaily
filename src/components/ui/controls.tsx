"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Tabs: a row of tape patches. The active tab is filled and marked.          */
/* -------------------------------------------------------------------------- */

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "tng-scroll-x flex gap-1.5 border-b-2 border-line pb-2",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[2px] border-2 border-line bg-surface px-3",
        "font-display text-[0.6875rem] font-extrabold uppercase tracking-[0.1em] text-muted",
        "transition-colors hover:border-keyline hover:text-foreground",
        "data-[state=active]:border-keyline data-[state=active]:bg-bone data-[state=active]:text-ink",
        "data-[state=active]:shadow-[var(--shadow-hard-sm)]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("pt-3 outline-none", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Switch: a physical toggle with a hard-edged thumb.                         */
/* -------------------------------------------------------------------------- */

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-[2px] border-2 border-keyline",
        "bg-surface-strong transition-colors data-[state=checked]:bg-lime",
        "disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 rounded-[1px] bg-foreground transition-transform",
          "translate-x-[3px] data-[state=checked]:translate-x-[1.4rem] data-[state=checked]:bg-ink",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Select: a recessed field with a stencil chevron.                           */
/* -------------------------------------------------------------------------- */

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-11 w-full items-center justify-between gap-2 rounded-[3px] border-2 border-line bg-wall-deep px-3",
        "font-body text-[0.9375rem] text-foreground outline-none transition-colors",
        "hover:border-muted/60 focus:border-lime",
        "disabled:cursor-not-allowed disabled:opacity-55",
        "data-[placeholder]:text-muted",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden="true" className="size-4 text-muted" strokeWidth={2.6} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={4}
        className={cn(
          "z-100 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden",
          "border-2 border-keyline bg-surface shadow-[var(--shadow-hard)]",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-[2px] px-2 py-2 pr-8",
        "text-[0.875rem] text-foreground outline-none",
        "data-[highlighted]:bg-surface-strong data-[state=checked]:bg-lime data-[state=checked]:text-ink",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <Check aria-hidden="true" className="size-4" strokeWidth={3} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
