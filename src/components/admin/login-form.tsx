"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getBrowserSupabase } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
});

const mfaSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode harus 6 digit angka dari aplikasi authenticator."),
});

type LoginValues = z.infer<typeof loginSchema>;
type MfaValues = z.infer<typeof mfaSchema>;

/**
 * Login form. Authenticates against Supabase Auth in the browser so the SSR
 * cookie helpers receive the session, then refreshes so middleware and the
 * server layout both observe the new cookies.
 *
 * When the account has a verified MFA factor, the password step only reaches
 * AAL1; a second screen asks for the TOTP code and calls challenge/verify to
 * lift the session to AAL2 before navigating.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [mfaStep, setMfaStep] = React.useState(false);
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [challengeId, setChallengeId] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    register: registerMfa,
    handleSubmit: handleSubmitMfa,
    formState: { errors: errorsMfa, isSubmitting: isSubmittingMfa },
  } = useForm<MfaValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: "" },
  });

  const navigateNext = () => {
    // `next` is validated server-side to be a relative /admin path.
    router.replace(params.get("next") === next ? next : next);
    router.refresh();
  };

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

    // Password accepted, but the session may only be at AAL1. If the user has
    // a verified factor, keep them on this screen for the TOTP step instead of
    // navigating into a proxy redirect loop.
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      setFormError("Gagal memeriksa status verifikasi dua langkah. Coba lagi.");
      return;
    }

    if ((aal?.currentLevel ?? "aal1") !== "aal2" && aal?.nextLevel === "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp.find((f) => f.status === "verified");
      if (totp) {
        setFactorId(totp.id);
        setMfaStep(true);
        return;
      }
    }

    navigateNext();
  });

  const onSubmitMfa = handleSubmitMfa(async (values) => {
    setFormError(null);
    const supabase = getBrowserSupabase();
    if (!supabase || !factorId) {
      setFormError("Sesi tidak dikenali. Ulangi dari password.");
      setMfaStep(false);
      return;
    }

    // Reuse the existing challenge for retries: the MFA endpoints allow only
    // 15 challenges per hour per IP, so a fresh challenge per attempt would
    // exhaust the budget quickly.
    let activeChallengeId = challengeId;
    if (!activeChallengeId) {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        setFormError(`Gagal menyiapkan verifikasi: ${challengeError.message}`);
        return;
      }
      activeChallengeId = challenge.id;
      setChallengeId(activeChallengeId);
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: activeChallengeId,
      code: values.code,
    });

    if (verifyError) {
      setFormError("Kode salah atau sudah kedaluwarsa. Periksa authenticator lalu coba lagi.");
      return;
    }

    navigateNext();
  });

  if (mfaStep) {
    return (
      <form onSubmit={onSubmitMfa} noValidate className="mt-5 grid gap-4">
        <div className="flex items-center gap-2 border-l-2 border-lime pl-2.5">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-lime" strokeWidth={2.4} />
          <p className="text-[0.8125rem] leading-relaxed text-muted">
            Verifikasi dua langkah aktif untuk akun ini. Masukkan kode 6 digit
            dari aplikasi authenticator kamu.
          </p>
        </div>

        <Field label="Kode authenticator" htmlFor="mfa-code" required error={errorsMfa.code?.message}>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            aria-invalid={Boolean(errorsMfa.code)}
            {...registerMfa("code")}
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

        <Button type="submit" variant="primary" size="lg" block disabled={isSubmittingMfa}>
          {isSubmittingMfa ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              Memverifikasi
            </>
          ) : (
            "Verifikasi"
          )}
        </Button>
      </form>
    );
  }

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
