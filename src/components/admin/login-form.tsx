"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getBrowserSupabase } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Login form. Authenticates against Supabase Auth in the browser so the SSR
 * cookie helpers receive the session, then refreshes so middleware and the
 * server layout both observe the new cookies.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setFormError("Supabase belum dikonfigurasi di environment ini.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Deliberately generic: a distinct "user not found" message would let
      // anyone enumerate valid editor accounts.
      setFormError("Email atau password salah.");
      return;
    }

    // `next` is validated server-side to be a relative /admin path.
    router.replace(params.get("next") === next ? next : next);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 grid gap-4">
      <Field label="Email" htmlFor="email" required error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      {formError ? (
        <p
          role="alert"
          className="border-l-2 border-danger bg-danger/10 px-2.5 py-2 text-[0.8125rem] font-semibold text-danger"
        >
          {formError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" block disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" />
            Memeriksa
          </>
        ) : (
          "Masuk"
        )}
      </Button>
    </form>
  );
}
