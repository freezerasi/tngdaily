import * as React from "react";

import { cn } from "@/lib/utils";

/** Input: recessed field on a banner. Focus lands as a lime keyline. */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-11 w-full min-w-0 rounded-[3px] border-2 border-line bg-wall-deep px-3",
      "font-body text-[0.9375rem] text-foreground placeholder:text-muted/70",
      "transition-colors outline-none",
      "hover:border-muted/60 focus:border-lime",
      "disabled:cursor-not-allowed disabled:opacity-55",
      "aria-invalid:border-danger",
      "file:mr-3 file:h-7 file:border-2 file:border-keyline file:bg-bone file:px-2 file:font-display file:text-[0.6875rem] file:font-extrabold file:uppercase file:text-ink",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 5, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      "w-full rounded-[3px] border-2 border-line bg-wall-deep px-3 py-2.5",
      "font-body text-[0.9375rem] leading-relaxed text-foreground placeholder:text-muted/70",
      "transition-colors outline-none resize-y",
      "hover:border-muted/60 focus:border-lime",
      "disabled:cursor-not-allowed disabled:opacity-55",
      "aria-invalid:border-danger",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "tng-label flex items-center gap-1.5 text-muted",
      "has-disabled:opacity-55",
      className,
    )}
    {...props}
  >
    {children}
    {required ? (
      <span aria-hidden="true" className="text-orange">
        *
      </span>
    ) : null}
  </label>
));
Label.displayName = "Label";

/**
 * Field: label, control, hint, and error in one block. Errors are announced and
 * marked with an icon-free text prefix so colour is never the only signal.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {hint ? (
        <p id={hintId} className="text-[0.8125rem] leading-snug text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex gap-1.5 border-l-2 border-danger pl-2 text-[0.8125rem] font-semibold leading-snug text-danger"
        >
          <span className="tng-label text-danger">Salah:</span>
          <span className="font-body font-medium">{error}</span>
        </p>
      ) : null}
    </div>
  );
}
