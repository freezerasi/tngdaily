"use client";

import dynamic from "next/dynamic";

/**
 * Lazy boundary for the submission form. `ssr: false` is only legal inside a
 * Client Component, so this tiny wrapper owns the dynamic import: the form's
 * react-hook-form + zod chunk (~400KB with its group) never touches the
 * server render and only downloads after paint, behind a skeleton.
 */
const KirimBeritaForm = dynamic(
  () =>
    import("@/components/public/kirim-berita-form").then(
      (module) => module.KirimBeritaForm,
    ),
  {
    ssr: false,
    loading: () => <FormSkeleton />,
  },
);

function FormSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-2">
      <div className="tng-shimmer h-12 border-2 border-line" />
      <div className="tng-shimmer h-12 border-2 border-line" />
      <div className="tng-shimmer h-32 border-2 border-line" />
      <div className="tng-shimmer h-11 w-40 border-2 border-keyline" />
    </div>
  );
}

export function KirimBeritaFormLazy() {
  return <KirimBeritaForm />;
}
